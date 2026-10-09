import { useState } from 'react';
import type { FC } from 'react';
import { 
  X, 
  ShieldCheck, 
  Search, 
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Code2,
  Sparkles,
  Info
} from 'lucide-react';
import { generateFilterPrompt } from '../utils/aiPromptGenerator';

interface FilterExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export type FilterPipelineScope = 'ALL' | 'CONTAINER_SERVLET' | 'SECURITY_FILTER_CHAIN';

export interface FilterEntry {
  order: number;
  internalOrderIndex?: number; // Exact order value from Spring Security FilterOrderRegistration
  name: string;
  className: string;
  location: 'Tomcat Servlet Container' | 'Delegating Bridge' | 'Spring Security FilterChain';
  scope: 'CONTAINER_SERVLET' | 'SECURITY_FILTER_CHAIN';
  whatItDoes: string;
  detailedExplanation: string;
  precedes: string;
  succeeds: string;
  failureMode: string;
  mutatesThreadLocal: string;
  configHook: string;
  codeSnippet: string;
  nodeId?: string;
}

const ALL_SPRING_FILTERS: FilterEntry[] = [
  // =========================================================================
  // PART 1: TOMCAT CONTAINER FILTERS (ApplicationFilterChain)
  // =========================================================================
  {
    order: 1,
    name: 'CharacterEncodingFilter',
    className: 'org.springframework.web.filter.CharacterEncodingFilter',
    location: 'Tomcat Servlet Container',
    scope: 'CONTAINER_SERVLET',
    whatItDoes: 'Forces UTF-8 character encoding on HttpServletRequest before any parameter read operations occur.',
    detailedExplanation: 'Enforces request and response character encoding (UTF-8 by default). Must execute before any call to request.getParameter(), getReader(), or getInputStream(), because once the servlet container parses parameters using the platform default encoding (e.g. ISO-8859-1), the encoding is permanently locked for that request lifecycle.',
    precedes: 'All downstream container filters, CORS processing, DelegatingFilterProxy, and Servlets.',
    succeeds: 'Tomcat Coyote HTTP/1.1 connector and StandardContext valve pipeline.',
    failureMode: 'If placed after any filter that reads request parameters, non-ASCII characters (UTF-8 emojis, accents, non-Latin scripts) get permanently corrupted into mojibake (e.g., "???").',
    mutatesThreadLocal: 'None (mutates HttpServletRequest state directly)',
    configHook: 'server.servlet.encoding.charset=UTF-8\nserver.servlet.encoding.force=true',
    codeSnippet: `// org.springframework.web.filter.CharacterEncodingFilter
@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
    String encoding = getEncoding();
    if (encoding != null) {
        if (isForceRequestEncoding() || request.getCharacterEncoding() == null) {
            request.setCharacterEncoding(encoding);
        }
        if (isForceResponseEncoding()) {
            response.setCharacterEncoding(encoding);
        }
    }
    filterChain.doFilter(request, response);
}`,
    nodeId: 'character_encoding_filter'
  },
  {
    order: 2,
    name: 'FormContentFilter',
    className: 'org.springframework.web.filter.FormContentFilter',
    location: 'Tomcat Servlet Container',
    scope: 'CONTAINER_SERVLET',
    whatItDoes: 'Parses form data (application/x-www-form-urlencoded) for HTTP PUT, PATCH, and DELETE requests.',
    detailedExplanation: 'Standard Servlet specification only mandates parsing form data into request parameters for HTTP POST requests. FormContentFilter inspects incoming PUT, PATCH, and DELETE requests, parses application/x-www-form-urlencoded bodies, and wraps the request in a FormContentRequestWrapper so request.getParameter() works transparently.',
    precedes: 'DelegatingFilterProxy, DispatcherServlet, and controller argument resolvers.',
    succeeds: 'CharacterEncodingFilter',
    failureMode: 'Without this filter, submitting HTML form submissions with PUT/PATCH methods results in empty request parameters in Spring controllers (@RequestParam receives null).',
    mutatesThreadLocal: 'None (wraps HttpServletRequest)',
    configHook: 'spring.mvc.formcontent.filter.enabled=true (enabled by default)',
    codeSnippet: `// org.springframework.web.filter.FormContentFilter
@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
    if (("PUT".equals(request.getMethod()) || "PATCH".equals(request.getMethod()) || "DELETE".equals(request.getMethod()))
            && isFormSubmission(request)) {
        HttpServletRequest wRequest = new FormContentRequestWrapper(request, parseForm(request));
        filterChain.doFilter(wRequest, response);
        return;
    }
    filterChain.doFilter(request, response);
}`
  },
  {
    order: 3,
    name: 'CorsFilter (Container Level)',
    className: 'org.springframework.web.filter.CorsFilter',
    location: 'Tomcat Servlet Container',
    scope: 'CONTAINER_SERVLET',
    whatItDoes: 'Intercepts HTTP OPTIONS pre-flight requests before Spring Security to prevent 401/403 preflight blocking.',
    detailedExplanation: 'When registered as a container-level filter (e.g. via FilterRegistrationBean with Ordered.HIGHEST_PRECEDENCE), this filter intercepts browser CORS preflight (OPTIONS) requests at the servlet container boundary. It returns 200 OK with Access-Control-Allow-* headers before the request ever touches Spring Security or DelegatingFilterProxy.',
    precedes: 'DelegatingFilterProxy / Spring Security FilterChain (Prevents unauthenticated CORS OPTIONS preflights from receiving 401/403).',
    succeeds: 'CharacterEncodingFilter, FormContentFilter',
    failureMode: 'If CORS is NOT configured at container level or via http.cors(), unauthenticated preflight OPTIONS requests fail with 401/403 in the security chain, breaking browser single-page applications.',
    mutatesThreadLocal: 'None',
    configHook: '@Bean FilterRegistrationBean<CorsFilter> or WebMvcConfigurer.addCorsMappings',
    codeSnippet: `// Container-level CORS registration
@Bean
public FilterRegistrationBean<CorsFilter> corsFilter() {
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowCredentials(true);
    config.addAllowedOriginPattern("*");
    config.addAllowedHeader("*");
    config.addAllowedMethod("*");
    source.registerCorsConfiguration("/**", config);
    FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
    bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
    return bean;
}`
  },
  {
    order: 4,
    name: 'DelegatingFilterProxy',
    className: 'org.springframework.web.filter.DelegatingFilterProxy',
    location: 'Delegating Bridge',
    scope: 'CONTAINER_SERVLET',
    whatItDoes: 'Crucial bridge connecting the standard Servlet Container lifecycle to the Spring ApplicationContext.',
    detailedExplanation: 'Serves as the architectural bridge connecting the servlet container (Tomcat) lifecycle to the Spring ApplicationContext. Tomcat initializes before Spring\'s root WebApplicationContext is ready; DelegatingFilterProxy registers in Tomcat as a standard Filter, and upon the first request, lazily looks up the target Spring bean ("springSecurityFilterChain") from WebApplicationContextUtils and delegates execution.',
    precedes: 'FilterChainProxy and all Spring Security filters.',
    succeeds: 'Standard Tomcat Container Filters (CharacterEncoding, FormContent, Container CORS).',
    failureMode: 'Throws IllegalStateException: "No WebApplicationContext found" if initialized before Spring context bootstrap completes or if the targetBeanName does not match any Spring bean.',
    mutatesThreadLocal: 'None',
    configHook: 'spring.security.filter.order=-100 (Spring Boot auto-config default)',
    codeSnippet: `// org.springframework.web.filter.DelegatingFilterProxy
@Override
public void doFilter(ServletRequest request, ServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
    Filter delegateToUse = this.delegate;
    if (delegateToUse == null) {
        WebApplicationContext wac = findWebApplicationContext();
        delegateToUse = initDelegate(wac); // looks up "springSecurityFilterChain"
        this.delegate = delegateToUse;
    }
    invokeDelegate(delegateToUse, request, response, filterChain);
}`,
    nodeId: 'delegating_filter_proxy'
  },

  // =========================================================================
  // PART 2: SPRING SECURITY FILTER CHAIN (SecurityFilterChain / VirtualFilterChain)
  // Exact Canonical Ordering from FilterOrderRegistration.java
  // =========================================================================
  {
    order: 5,
    internalOrderIndex: 100,
    name: 'DisableEncodeUrlFilter',
    className: 'org.springframework.security.web.session.DisableEncodeUrlFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Prevents sessionId URL rewriting (disables appending ;jsessionid=... to URLs in HTML hyperlinks).',
    detailedExplanation: 'Canonical Filter #1 in Spring Security. Wraps HttpServletResponse with a wrapper that overrides encodeURL() and encodeRedirectURL() to return the URL unchanged. This completely eliminates session ID leakage in URLs, defending against session hijacking via browser history, referer headers, and server access logs.',
    precedes: 'All other Spring Security filters.',
    succeeds: 'DelegatingFilterProxy / FilterChainProxy entry.',
    failureMode: 'Without this filter, links rendered by server-side templates (Thymeleaf/JSP) might append ;jsessionid=... if cookies are rejected, leaking credentials to third-party referrers.',
    mutatesThreadLocal: 'None (wraps HttpServletResponse)',
    configHook: 'Enabled by default in modern Spring Security',
    codeSnippet: `// org.springframework.security.web.session.DisableEncodeUrlFilter
@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) {
    filterChain.doFilter(request, new DontEncodeUrlResponseWrapper(response));
}`
  },
  {
    order: 6,
    internalOrderIndex: 200,
    name: 'WebAsyncManagerIntegrationFilter',
    className: 'org.springframework.security.web.context.request.async.WebAsyncManagerIntegrationFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Integrates SecurityContext with Spring MVC WebAsyncManager for asynchronous controller methods.',
    detailedExplanation: 'Canonical Filter #2. Binds a SecurityContextCallableProcessingInterceptor to the WebAsyncManager. When a controller method returns a Callable, CompletableFuture, or DeferredResult, this interceptor copies the SecurityContext from the request thread to the background worker thread so @AuthenticationPrincipal remains accessible in async code.',
    precedes: 'SecurityContextHolderFilter, Authentication, and Authorization filters.',
    succeeds: 'DisableEncodeUrlFilter',
    failureMode: 'Without this filter, async controller threads execute with a null SecurityContext, causing unexpected AccessDeniedException inside asynchronous worker threads.',
    mutatesThreadLocal: 'Populates SecurityContext across asynchronous thread boundaries',
    configHook: 'Enabled by default in Spring Security Web',
    codeSnippet: `// WebAsyncManagerIntegrationFilter
WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);
SecurityContextCallableProcessingInterceptor interceptor = new SecurityContextCallableProcessingInterceptor();
asyncManager.registerCallableInterceptor(CallableToken.class, interceptor);
filterChain.doFilter(request, response);`
  },
  {
    order: 7,
    internalOrderIndex: 300,
    name: 'SecurityContextHolderFilter',
    className: 'org.springframework.security.web.context.SecurityContextHolderFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Loads SecurityContext into ThreadLocal SecurityContextHolder. Clears it unconditionally in finally block.',
    detailedExplanation: 'Canonical Filter #3 (replaced legacy SecurityContextPersistenceFilter in Spring Security 6). Loads the SecurityContext from SecurityContextRepository (Session or Token) and sets it in SecurityContextHolderStrategy. Crucially uses a Supplier<SecurityContext> to defer context loading until actually requested, optimizing performance. Clears ThreadLocal in finally block to prevent thread pool contamination.',
    precedes: 'All authentication, CSRF, and authorization filters.',
    succeeds: 'WebAsyncManagerIntegrationFilter',
    failureMode: 'If ThreadLocal is not cleared in finally block, Tomcat worker threads recycled by the thread pool will carry the previous user\'s authenticated identity into subsequent requests.',
    mutatesThreadLocal: 'ThreadLocal<SecurityContext> via SecurityContextHolderStrategy',
    configHook: 'http.securityContext(c -> c.requireExplicitSave(true))',
    codeSnippet: `// Spring Security 6: SecurityContextHolderFilter
Supplier<SecurityContext> deferredContext = this.securityContextRepository.loadDeferredContext(request);
this.securityContextHolderStrategy.setDeferredContext(deferredContext);
try {
    chain.doFilter(request, response);
} finally {
    this.securityContextHolderStrategy.clearContext();
}`,
    nodeId: 'sec_filter_context'
  },
  {
    order: 8,
    internalOrderIndex: 400,
    name: 'HeaderWriterFilter',
    className: 'org.springframework.security.web.header.HeaderWriterFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Injects defensive security headers (X-Content-Type-Options: nosniff, X-Frame-Options: DENY, HSTS).',
    detailedExplanation: 'Canonical Filter #4. Applies defensive security headers to the HttpServletResponse: X-Content-Type-Options: nosniff (prevents MIME sniffing), X-Frame-Options: DENY (prevents clickjacking), Strict-Transport-Security (HSTS), and Content-Security-Policy (CSP). Sits early in the chain so even authentication failure error pages receive defensive headers.',
    precedes: 'CORS, CSRF, Authentication, and DispatcherServlet.',
    succeeds: 'SecurityContextHolderFilter',
    failureMode: 'Embedding Spring Boot UI / iframe inside external customer portals fails with X-Frame-Options DENY unless explicitly relaxed via http.headers(h -> h.frameOptions(f -> f.sameOrigin())).',
    mutatesThreadLocal: 'None',
    configHook: 'http.headers(headers -> headers.frameOptions(f -> f.sameOrigin()))',
    codeSnippet: `// Configures defensive response headers
http.headers(headers -> headers
    .xssProtection(Customizer.withDefaults())
    .contentSecurityPolicy(cps -> cps.policyDirectives("default-src 'self'"))
    .frameOptions(frame -> frame.sameOrigin())
);`
  },
  {
    order: 9,
    internalOrderIndex: 500,
    name: 'CorsFilter (SecurityFilterChain Level)',
    className: 'org.springframework.web.filter.CorsFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Processes CORS headers within the security chain when configured via http.cors().',
    detailedExplanation: 'Canonical Filter #5. When configured inside Spring Security via http.cors(), this filter executes directly after HeaderWriterFilter and BEFORE CsrfFilter. It handles CORS preflight OPTIONS requests, injecting Access-Control-* headers so cross-origin calls are not blocked by CSRF or authentication checks.',
    precedes: 'CsrfFilter, LogoutFilter, and all Authentication filters.',
    succeeds: 'HeaderWriterFilter',
    failureMode: 'If CORS filter is placed AFTER authentication or CSRF, unauthenticated preflight requests fail with 401 Unauthorized or 403 Forbidden.',
    mutatesThreadLocal: 'None',
    configHook: 'http.cors(Customizer.withDefaults())',
    codeSnippet: `// Spring Security DSL CORS configuration
http.cors(cors -> cors.configurationSource(corsConfigurationSource()));`
  },
  {
    order: 10,
    internalOrderIndex: 600,
    name: 'CsrfFilter',
    className: 'org.springframework.security.web.csrf.CsrfFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Validates CSRF token header for state-mutating verbs (POST, PUT, DELETE). Rejects forged cross-site requests.',
    detailedExplanation: 'Canonical Filter #6. Inspects state-changing HTTP methods (POST, PUT, DELETE, PATCH). Compares the CSRF token passed in the request header (X-XSRF-TOKEN) or parameter against the token stored in HttpSession or cookie (CookieCsrfTokenRepository). If missing or mismatched, halts the chain and throws InvalidCsrfTokenException (HTTP 403 Forbidden).',
    precedes: 'LogoutFilter and all Authentication filters.',
    succeeds: 'CorsFilter, HeaderWriterFilter',
    failureMode: 'Pure stateless REST APIs using Bearer JWT tokens receive unexpected HTTP 403 Forbidden on POST/PUT requests unless CSRF is explicitly disabled via http.csrf(csrf -> csrf.disable()).',
    mutatesThreadLocal: 'Request attribute: _csrf (DeferredCsrfToken)',
    configHook: 'http.csrf(csrf -> csrf.disable()) or CookieCsrfTokenRepository',
    codeSnippet: `// Disable for stateless REST or configure Cookie repository for SPAs
http.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
    .ignoringRequestMatchers("/api/webhooks/**")
);`,
    nodeId: 'sec_filter_csrf'
  },
  {
    order: 11,
    internalOrderIndex: 700,
    name: 'LogoutFilter',
    className: 'org.springframework.security.web.authentication.logout.LogoutFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Catches /logout requests, invalidates session, clears cookies, and clears SecurityContextHolder.',
    detailedExplanation: 'Canonical Filter #7. Intercepts requests matching the logout URL (POST /logout by default in Spring Security 6). Delegates to a composite of LogoutHandler instances (SecurityContextLogoutHandler, CookieClearingLogoutHandler, HeaderWriterLogoutHandler) which clear the SecurityContext, invalidate the HttpSession, remove remember-me tokens, and redirect to the logout success URL.',
    precedes: 'Authentication filters (Logout must be processed before checking credentials).',
    succeeds: 'CsrfFilter',
    failureMode: 'In Spring Security 6, GET /logout is disallowed by default (requires POST) to prevent CSRF logout attacks; sending GET /logout results in 404/405 without logging out.',
    mutatesThreadLocal: 'SecurityContextHolder.clearContext()',
    configHook: 'http.logout(logout -> logout.logoutUrl("/auth/logout").deleteCookies("JSESSIONID"))',
    codeSnippet: `// Configures logout endpoints and handlers
http.logout(logout -> logout
    .logoutUrl("/auth/logout")
    .logoutSuccessHandler((req, res, auth) -> res.setStatus(HttpServletResponse.SC_OK))
    .invalidateHttpSession(true)
    .clearAuthentication(true)
);`
  },
  {
    order: 12,
    internalOrderIndex: 800,
    name: 'UsernamePasswordAuthenticationFilter',
    className: 'org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Processes form-based login requests matching POST /login and delegates to AuthenticationManager.',
    detailedExplanation: 'Canonical Filter #8. Intercepts POST requests matching "/login". Extracts "username" and "password" form parameters, constructs an unauthenticated UsernamePasswordAuthenticationToken, and calls AuthenticationManager.authenticate(). On success, delegates to SavedRequestAwareAuthenticationSuccessHandler; on failure, delegates to SimpleUrlAuthenticationFailureHandler.',
    precedes: 'BasicAuthenticationFilter, BearerTokenAuthenticationFilter, RequestCacheAwareFilter.',
    succeeds: 'LogoutFilter, CsrfFilter',
    failureMode: 'Sending credentials via JSON body { "username": "..." } instead of application/x-www-form-urlencoded fails to trigger this filter by default without a custom authentication filter.',
    mutatesThreadLocal: 'SecurityContextHolder.setAuthentication(...)',
    configHook: 'http.formLogin(form -> form.loginPage("/login").permitAll())',
    codeSnippet: `// Spring Security Form Login setup
http.formLogin(form -> form
    .loginProcessingUrl("/api/auth/login")
    .successHandler((req, res, auth) -> res.setStatus(200))
    .failureHandler((req, res, ex) -> res.sendError(401, ex.getMessage()))
);`
  },
  {
    order: 13,
    internalOrderIndex: 1200,
    name: 'BasicAuthenticationFilter',
    className: 'org.springframework.security.web.authentication.www.BasicAuthenticationFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Extracts HTTP Basic credentials (Authorization: Basic <base64>) and authenticates the user.',
    detailedExplanation: 'Canonical Filter #9 (Internal position ~1200). Inspects the "Authorization" header for the "Basic " prefix. Decodes Base64 credentials into username:password, packages them into a UsernamePasswordAuthenticationToken, and delegates to AuthenticationManager. If authentication fails, triggers BasicAuthenticationEntryPoint (returns 401 with WWW-Authenticate: Basic realm=...).',
    precedes: 'BearerTokenAuthenticationFilter, RequestCacheAwareFilter.',
    succeeds: 'UsernamePasswordAuthenticationFilter',
    failureMode: 'Sending invalid Basic credentials triggers 401 challenge popups in web browsers if BasicAuthenticationEntryPoint sends the WWW-Authenticate header.',
    mutatesThreadLocal: 'SecurityContextHolder.setAuthentication(...)',
    configHook: 'http.httpBasic(Customizer.withDefaults())',
    codeSnippet: `// HTTP Basic configuration in Spring Security 6
http.httpBasic(basic -> basic.realmName("MyApiRealm"));`
  },
  {
    order: 14,
    internalOrderIndex: 1300,
    name: 'BearerTokenAuthenticationFilter',
    className: 'org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Extracts Bearer <JWT> from Authorization header, verifies signature via JwtDecoder, and binds authenticated Principal.',
    detailedExplanation: 'Canonical Filter #10 (Internal position ~1300, runs after Basic Authentication). Resource Server OAuth2 / JWT authentication filter. Reads the "Authorization: Bearer <token>" header using BearerTokenResolver. Passes token to AuthenticationManager (delegating to JwtAuthenticationProvider). Uses Nimbus / Spring Security JwtDecoder to verify cryptographic signature, expiration (exp), issuer (iss), and claims, storing JwtAuthenticationToken in SecurityContextHolder.',
    precedes: 'RequestCacheAwareFilter, SecurityContextHolderAwareRequestFilter, AnonymousAuthenticationFilter, AuthorizationFilter.',
    succeeds: 'BasicAuthenticationFilter, UsernamePasswordAuthenticationFilter',
    failureMode: 'Expired JWTs or server clock skew (>60s) throw JwtValidationException, which is transformed into 401 Unauthorized with WWW-Authenticate: Bearer error="invalid_token".',
    mutatesThreadLocal: 'SecurityContextHolder.setAuthentication(jwtToken)',
    configHook: 'http.oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))',
    codeSnippet: `// OAuth2 Resource Server JWT Decoder
http.oauth2ResourceServer(oauth -> oauth
    .jwt(jwt -> jwt.decoder(jwtDecoder()))
    .authenticationEntryPoint(new CustomAuthenticationEntryPoint())
);`,
    nodeId: 'sec_filter_auth'
  },
  {
    order: 15,
    internalOrderIndex: 1400,
    name: 'RequestCacheAwareFilter',
    className: 'org.springframework.security.web.savedrequest.RequestCacheAwareFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Replays the original cached request URL that was interrupted by a login redirect.',
    detailedExplanation: 'Canonical Filter #11. When an unauthenticated user attempts to access a protected URL (e.g. GET /dashboard), Spring intercepts them and saves the request into HttpSessionRequestCache before redirecting to login. Once login succeeds, this filter checks the cache, extracts the original request, and wraps it so the user lands on their originally intended destination.',
    precedes: 'SecurityContextHolderAwareRequestFilter, AnonymousAuthenticationFilter.',
    succeeds: 'BearerTokenAuthenticationFilter, BasicAuthenticationFilter',
    failureMode: 'In single-page applications (SPA) or stateless APIs, request caching is unnecessary and can cause stale state; configure http.requestCache(c -> c.nullRequestCache()) to save memory.',
    mutatesThreadLocal: 'None',
    configHook: 'http.requestCache(c -> c.nullRequestCache())',
    codeSnippet: `// Disable saved request cache for stateless REST APIs
http.requestCache(cache -> cache
    .requestCache(new NullRequestCache())
);`
  },
  {
    order: 16,
    internalOrderIndex: 1500,
    name: 'SecurityContextHolderAwareRequestFilter',
    className: 'org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Wraps HttpServletRequest so standard Servlet methods like request.isUserInRole() consult Spring Security.',
    detailedExplanation: 'Canonical Filter #12. Wraps the native HttpServletRequest with SecurityContextHolderAwareRequestWrapper. This allows legacy standard Servlet API methods (such as request.isUserInRole("ROLE_ADMIN"), request.getUserPrincipal(), and request.authenticate()) to seamlessly query the Spring Security context without coupling code directly to Spring Security classes.',
    precedes: 'RememberMeAuthenticationFilter, AnonymousAuthenticationFilter.',
    succeeds: 'RequestCacheAwareFilter',
    failureMode: 'If custom filters unwrap or replace the HttpServletRequest downstream, calls to request.isUserInRole() may revert to Tomcat container realm behavior instead of Spring Security roles.',
    mutatesThreadLocal: 'Wraps HttpServletRequest with SecurityContextHolderAwareRequestWrapper',
    configHook: 'Default enabled in WebSecurityConfiguration',
    codeSnippet: `// Allows standard Servlet APIs to delegate to Spring Security:
// boolean isAdmin = request.isUserInRole("ADMIN");
// Principal principal = request.getUserPrincipal();`
  },
  {
    order: 17,
    internalOrderIndex: 1700,
    name: 'RememberMeAuthenticationFilter',
    className: 'org.springframework.security.web.authentication.rememberme.RememberMeAuthenticationFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Auto-logs in users who possess a valid remember-me persistent cookie.',
    detailedExplanation: 'Canonical Filter #13. If SecurityContextHolder contains NO authentication, this filter inspects request cookies for the remember-me cookie. Validates token via RememberMeServices (TokenBasedRememberMeServices or PersistentTokenBasedRememberMeServices with database backing) and auto-authenticates the user.',
    precedes: 'AnonymousAuthenticationFilter, ExceptionTranslationFilter.',
    succeeds: 'SecurityContextHolderAwareRequestFilter',
    failureMode: 'Using in-memory remember-me tokens invalidates all user cookies whenever the Spring Boot server restarts; use PersistentTokenRepository (JDBC) in production.',
    mutatesThreadLocal: 'SecurityContextHolder.setAuthentication(rememberMeAuth)',
    configHook: 'http.rememberMe(rm -> rm.tokenRepository(persistentTokenRepository()))',
    codeSnippet: `// Persistent Remember-Me setup
http.rememberMe(rm -> rm
    .tokenRepository(persistentTokenRepository())
    .tokenValiditySeconds(86400 * 30) // 30 days
);`
  },
  {
    order: 18,
    internalOrderIndex: 1800,
    name: 'AnonymousAuthenticationFilter',
    className: 'org.springframework.security.web.authentication.AnonymousAuthenticationFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Assigns an AnonymousAuthenticationToken if no authentication is present, avoiding null checks.',
    detailedExplanation: 'Canonical Filter #14. Ensures that every request passing through the security filter chain has a non-null Authentication object. If SecurityContextHolder.getContext().getAuthentication() is null (meaning no prior filter authenticated the caller), it creates an AnonymousAuthenticationToken with principal "anonymousUser" and authority "ROLE_ANONYMOUS". This eliminates tedious null checks across downstream interceptors and controllers.',
    precedes: 'SessionManagementFilter, ExceptionTranslationFilter, AuthorizationFilter.',
    succeeds: 'RememberMeAuthenticationFilter',
    failureMode: 'Checking "auth != null" in a controller always evaluates to true; developers must check "auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)" to detect authenticated users.',
    mutatesThreadLocal: 'SecurityContextHolder (sets AnonymousAuthenticationToken)',
    configHook: 'http.anonymous(anon -> anon.principal("guest"))',
    codeSnippet: `// Default Anonymous token injection:
if (SecurityContextHolder.getContext().getAuthentication() == null) {
    Authentication auth = new AnonymousAuthenticationToken(
        "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")
    );
    SecurityContextHolder.getContext().setAuthentication(auth);
}`
  },
  {
    order: 19,
    internalOrderIndex: 2000,
    name: 'SessionManagementFilter',
    className: 'org.springframework.security.web.session.SessionManagementFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Enforces session fixation protection strategies and maximum concurrent session limits.',
    detailedExplanation: 'Canonical Filter #15. Evaluates session authentication strategies: SessionFixationProtectionStrategy (migrates session ID upon authentication to prevent session fixation attacks) and ConcurrentSessionControlAuthenticationStrategy (enforces max concurrent sessions per user, e.g. kicking out old login or preventing new login).',
    precedes: 'ExceptionTranslationFilter and AuthorizationFilter.',
    succeeds: 'AnonymousAuthenticationFilter',
    failureMode: 'In clustered environments, concurrent session control requires Spring Session (Redis) or custom SessionRegistry bean; otherwise user session counts are tracked purely in local JVM memory.',
    mutatesThreadLocal: 'None',
    configHook: 'http.sessionManagement(sm -> sm.maximumSessions(1).maxSessionsPreventsLogin(true))',
    codeSnippet: `// Session Fixation & Concurrency Control
http.sessionManagement(session -> session
    .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
    .sessionFixation(fixation -> fixation.changeSessionId())
    .maximumSessions(1)
);`
  },
  {
    order: 20,
    internalOrderIndex: 2600,
    name: 'ExceptionTranslationFilter',
    className: 'org.springframework.security.web.access.ExceptionTranslationFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Catches AccessDeniedException (returns 403) and AuthenticationException (starts 401 / login challenge).',
    detailedExplanation: 'Canonical Filter #16. Architectural bridge between downstream security exceptions and HTTP responses. Sits directly above AuthorizationFilter in the chain, executing in a try-catch block. Catches AuthenticationException (initiating AuthenticationEntryPoint to trigger 401 or redirect to login) and AccessDeniedException (delegating to AccessDeniedHandler to return 403 Forbidden).',
    precedes: 'AuthorizationFilter.',
    succeeds: 'SessionManagementFilter',
    failureMode: 'Exceptions thrown in filters situated ABOVE ExceptionTranslationFilter (e.g., custom filter at position 8) are NOT caught by ExceptionTranslationFilter and bypass custom 401/403 handlers, resulting in raw 500 error pages.',
    mutatesThreadLocal: 'None',
    configHook: 'http.exceptionHandling(ex -> ex.authenticationEntryPoint(...).accessDeniedHandler(...))',
    codeSnippet: `// org.springframework.security.web.access.ExceptionTranslationFilter
try {
    chain.doFilter(request, response);
} catch (IOException | ServletException ex) {
    // If AuthenticationException -> sendChallenge(request, response, ex);
    // If AccessDeniedException -> handleAccessDenied(request, response, ex);
    handleSpringSecurityException(request, response, chain, ex);
}`
  },
  {
    order: 21,
    internalOrderIndex: 2700,
    name: 'AuthorizationFilter',
    className: 'org.springframework.security.web.access.intercept.AuthorizationFilter',
    location: 'Spring Security FilterChain',
    scope: 'SECURITY_FILTER_CHAIN',
    whatItDoes: 'Final security barrier: checks AuthorizationManager rules before request enters DispatcherServlet.',
    detailedExplanation: 'Canonical Filter #17 (replaced legacy FilterSecurityInterceptor in Spring Security 6). The final security authorization checkpoint before the request reaches DispatcherServlet. Evaluates the request against configured AuthorizationManager rules (e.g., .requestMatchers("/admin/**").hasRole("ADMIN"), .anyRequest().authenticated()). If authorization fails, throws AccessDeniedException which is immediately caught by the preceding ExceptionTranslationFilter.',
    precedes: 'DispatcherServlet.doDispatch()',
    succeeds: 'ExceptionTranslationFilter',
    failureMode: 'Misconfigured requestMatchers with trailing slashes (e.g., "/api/orders" vs "/api/orders/") or missing Spring MVC matchers can accidentally leave endpoints publicly exposed or unintentionally deny access.',
    mutatesThreadLocal: 'None',
    configHook: 'http.authorizeHttpRequests(auth -> auth.requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().authenticated())',
    codeSnippet: `// Spring Security 6 AuthorizationManager DSL
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/public/**").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .anyRequest().authenticated()
);`,
    nodeId: 'sec_filter_authz'
  }
];

export const FilterExplorerModal: FC<FilterExplorerModalProps> = ({
  isOpen,
  onClose,
  onSelectNode,
}) => {
  const [search, setSearch] = useState<string>('');
  const [activeScope, setActiveScope] = useState<FilterPipelineScope>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [copiedPromptOrder, setCopiedPromptOrder] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  if (!isOpen) return null;

  const filtered = ALL_SPRING_FILTERS.filter((f) => {
    const matchesScope = activeScope === 'ALL' || f.scope === activeScope;
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.className.toLowerCase().includes(search.toLowerCase()) ||
      f.whatItDoes.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase()) ||
      f.detailedExplanation.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesSearch;
  });

  const handleCopyPrompt = (filter: FilterEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = generateFilterPrompt(filter);
    navigator.clipboard.writeText(prompt);
    setCopiedPromptOrder(filter.order);
    setTimeout(() => setCopiedPromptOrder(null), 2500);
  };

  const handleCopyAllFiltersPrompt = () => {
    const prompt = `You are a Principal Spring Security & Servlet Internals Architect.

Please give me an exhaustive, production-grade master-class explanation of the two distinct filter execution pipelines in modern Spring Boot 3.x / Spring 6:

1. TOMCAT SERVLET CONTAINER PIPELINE (ApplicationFilterChain):
${ALL_SPRING_FILTERS.filter(f => f.scope === 'CONTAINER_SERVLET').map(f => `  - #${f.order} ${f.name} (${f.className}): ${f.whatItDoes}`).join('\n')}

2. SPRING SECURITY FILTER CHAIN (Dispatched by FilterChainProxy via SecurityFilterChain):
${ALL_SPRING_FILTERS.filter(f => f.scope === 'SECURITY_FILTER_CHAIN').map(f => `  - [Pos ${f.internalOrderIndex}] #${f.order} ${f.name} (${f.className}): ${f.whatItDoes}`).join('\n')}

PLEASE EXPLAIN IN DEPTH:
1. Architectural Boundary: Why Tomcat filters and Security filters run in two separate chains connected by DelegatingFilterProxy.
2. Exact Filter Order: Walk through why UsernamePasswordAuthenticationFilter (~800) precedes BasicAuthenticationFilter (~1200) and BearerTokenAuthenticationFilter (~1300).
3. Exception Handling: Why ExceptionTranslationFilter (~2600) sits directly above AuthorizationFilter (~2700) in a try-catch block.
4. Top 5 Production Bugs: CORS preflight 403, CSRF in stateless REST APIs, ThreadLocal pollution on recycled Tomcat threads, and async dispatch SecurityContext propagation.`;

    navigator.clipboard.writeText(prompt);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const toggleExpand = (order: number) => {
    setExpandedOrder((prev) => (prev === order ? null : order));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[92vh] bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Spring Boot Filter Architecture & Pipeline Directory
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Verified Spring Security 6.x / Spring Boot 3.x
                </span>
              </div>
              <p className="text-xs text-[#8b949e]">
                Exact canonical ordering verified from org.springframework.security FilterOrderRegistration & Tomcat ApplicationFilterChain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllFiltersPrompt}
              className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 text-purple-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Copy an exhaustive prompt explaining the entire filter chain to paste into ChatGPT/Claude"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#92ec56]" />
                  <span className="text-[#92ec56]">Prompt Copied!</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  <span>Copy Entire Chain AI Prompt</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scope Tabs & Search Bar */}
        <div className="px-5 py-3 bg-[#161b22] border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
            <button
              onClick={() => setActiveScope('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeScope === 'ALL'
                  ? 'bg-[#21262d] text-white shadow'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              All Filters (21)
            </button>
            <button
              onClick={() => setActiveScope('CONTAINER_SERVLET')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeScope === 'CONTAINER_SERVLET'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Tomcat Container Pipeline (4)
            </button>
            <button
              onClick={() => setActiveScope('SECURITY_FILTER_CHAIN')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeScope === 'SECURITY_FILTER_CHAIN'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              SecurityFilterChain (17)
            </button>
          </div>

          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, class, ThreadLocal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-9 pr-3 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
        </div>

        {/* Architectural Explanatory Banner */}
        <div className="bg-[#0d1117]/60 border-b border-[#30363d] px-5 py-2.5 flex items-center gap-2 text-xs text-[#8b949e]">
          <Info className="w-4 h-4 text-[#58a6ff] flex-shrink-0" />
          <span>
            <strong className="text-white">Two Distinct Pipelines: </strong>
            Tomcat filters run in the native container's <code className="text-[#79c0ff]">ApplicationFilterChain</code>. <code className="text-[#79c0ff]">DelegatingFilterProxy</code> bridges execution to Spring IoC, where <code className="text-[#79c0ff]">FilterChainProxy</code> executes the 17 security filters inside a <code className="text-[#79c0ff]">VirtualFilterChain</code>.
          </span>
        </div>

        {/* Filter Cards / Table */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#0d1117]">
          {filtered.map((filter) => {
            const isTomcat = filter.location === 'Tomcat Servlet Container';
            const isBridge = filter.location === 'Delegating Bridge';
            const badgeColor = isTomcat
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : isBridge
              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
              : 'bg-purple-500/10 text-purple-300 border-purple-500/30';
            const isExpanded = expandedOrder === filter.order;
            const isCopied = copiedPromptOrder === filter.order;

            return (
              <div
                key={filter.order}
                onClick={() => toggleExpand(filter.order)}
                className={`p-4 bg-[#161b22] rounded-xl border transition-all cursor-pointer ${
                  isExpanded 
                    ? 'border-[#58a6ff] ring-1 ring-[#58a6ff]/30 shadow-lg' 
                    : 'border-[#30363d] hover:border-[#58a6ff]/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex flex-col items-center">
                      <span className="w-8 h-8 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-[#92ec56] flex-shrink-0 mt-0.5">
                        #{filter.order}
                      </span>
                      {filter.internalOrderIndex && (
                        <span className="text-[9px] font-mono text-[#8b949e] mt-1" title="Spring Security FilterOrderRegistration internal order">
                          pos:{filter.internalOrderIndex}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-white text-sm">
                          {filter.name}
                        </h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeColor}`}>
                          {filter.location}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-[#8b949e] truncate mb-2">
                        {filter.className}
                      </p>

                      <p className="text-xs text-[#c9d1d9] leading-relaxed mb-2.5">
                        {filter.whatItDoes}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8b949e]">
                        <div>
                          <span className="text-[#58a6ff] font-semibold">ThreadLocal: </span>
                          <span className="font-mono text-[#c9d1d9]">{filter.mutatesThreadLocal}</span>
                        </div>
                        <span className="text-[#30363d]">•</span>
                        <div>
                          <span className="text-[#e3b341] font-semibold">Config: </span>
                          <span className="font-mono text-[#c9d1d9]">{filter.configHook}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-center mt-2 md:mt-0">
                    <button
                      onClick={(e) => handleCopyPrompt(filter, e)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#21262d] text-[#c9d1d9] hover:text-white hover:bg-[#30363d] border border-[#30363d] text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Generate and copy an expert study prompt for ChatGPT / Claude"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#92ec56]" />
                          <span className="text-[#92ec56]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-purple-400" />
                          <span>Copy AI Prompt</span>
                        </>
                      )}
                    </button>

                    {filter.nodeId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNode(filter.nodeId!);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#21262d] text-[#58a6ff] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <span>Canvas</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="p-1 text-[#8b949e]">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* EXPANDABLE DEEP DIVE SECTION */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#30363d]/80 space-y-3 animate-in fade-in duration-150">
                    {/* Deep Explanation */}
                    <div className="bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d]">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#58a6ff] block mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Detailed Internal Architecture & Mechanics:
                      </span>
                      <p className="text-xs text-[#e6edf3] leading-relaxed">
                        {filter.detailedExplanation}
                      </p>
                    </div>

                    {/* Precedes & Succeeds Positioning */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                        <span className="text-[11px] font-semibold text-emerald-400 block mb-1">
                          ▲ Must Run Before (Precedes):
                        </span>
                        <p className="text-[#8b949e]">{filter.precedes}</p>
                      </div>
                      <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                        <span className="text-[11px] font-semibold text-blue-400 block mb-1">
                          ▼ Must Run After (Succeeds):
                        </span>
                        <p className="text-[#8b949e]">{filter.succeeds}</p>
                      </div>
                    </div>

                    {/* Production Failure Mode */}
                    <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-lg text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-300 block mb-0.5">
                          Production Pitfall & Common Failure Mode:
                        </span>
                        <p className="text-amber-200/90 leading-relaxed">{filter.failureMode}</p>
                      </div>
                    </div>

                    {/* Code Snippet */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#8b949e] mb-1 font-mono">
                        <Code2 className="w-3.5 h-3.5 text-[#92ec56]" />
                        <span>Source / Configuration Implementation:</span>
                      </div>
                      <pre className="p-3 bg-[#090d13] border border-[#30363d] rounded-lg font-mono text-[11px] text-[#79c0ff] overflow-x-auto leading-relaxed">
                        <code>{filter.codeSnippet}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#161b22] border-t border-[#30363d] flex flex-wrap items-center justify-between gap-3 text-xs text-[#8b949e]">
          <div className="flex items-center gap-2">
            <span>Showing {filtered.length} filters ({activeScope === 'ALL' ? 'Total' : activeScope})</span>
            <span className="text-[#30363d]">•</span>
            <span>Click any card to expand deep-dive details</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyAllFiltersPrompt}
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Copy Full Chain AI Prompt</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#238636] text-white hover:bg-[#2ea043] font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
