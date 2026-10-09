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
  Sparkles
} from 'lucide-react';
import { generateFilterPrompt } from '../utils/aiPromptGenerator';

interface FilterExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export interface FilterEntry {
  order: number;
  name: string;
  className: string;
  location: 'Tomcat Servlet Container' | 'Delegating Bridge' | 'Spring Security FilterChain';
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
  {
    order: 1,
    name: 'CharacterEncodingFilter',
    className: 'org.springframework.web.filter.CharacterEncodingFilter',
    location: 'Tomcat Servlet Container',
    whatItDoes: 'Forces UTF-8 character encoding on HttpServletRequest before any parameter read operations occur.',
    detailedExplanation: 'Enforces request and response character encoding (UTF-8 by default). Must execute before any call to request.getParameter(), getReader(), or getInputStream(), because once the servlet container parses parameters using the platform default encoding (e.g. ISO-8859-1), the encoding is permanently locked for that request lifecycle.',
    precedes: 'All downstream filters, CORS processing, and servlets.',
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
    name: 'CorsFilter',
    className: 'org.springframework.web.filter.CorsFilter',
    location: 'Tomcat Servlet Container',
    whatItDoes: 'Intercepts HTTP OPTIONS pre-flight requests and injects Access-Control-Allow-Origin / Headers.',
    detailedExplanation: 'Processes HTTP OPTIONS pre-flight requests and cross-origin headers. If the request is a CORS pre-flight, it immediately injects Access-Control-Allow-Origin, Access-Control-Allow-Methods, and Access-Control-Allow-Headers and returns HTTP 200 without executing the rest of the filter chain or invoking DispatcherServlet.',
    precedes: 'DelegatingFilterProxy / Spring Security (Critical: must run before authentication so browsers are not blocked on unauthenticated OPTIONS preflights with 401/403).',
    succeeds: 'CharacterEncodingFilter',
    failureMode: 'When placed inside the protected Spring Security chain instead of at the servlet container boundary, browsers fail preflight with "CORS Missing Allow Origin" because unauthenticated OPTIONS requests get blocked by security checks.',
    mutatesThreadLocal: 'None',
    configHook: '@Bean CorsConfigurationSource or @CrossOrigin',
    codeSnippet: `// Intercepts OPTIONS preflight and sets Access-Control-* headers
@Bean
public CorsFilter corsFilter() {
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowCredentials(true);
    config.addAllowedOriginPattern("*");
    config.addAllowedHeader("*");
    config.addAllowedMethod("*");
    source.registerCorsConfiguration("/**", config);
    return new CorsFilter(source);
}`
  },
  {
    order: 3,
    name: 'DelegatingFilterProxy',
    className: 'org.springframework.web.filter.DelegatingFilterProxy',
    location: 'Delegating Bridge',
    whatItDoes: 'Crucial bridge between Tomcat and Spring ApplicationContext. Lazily retrieves bean "springSecurityFilterChain" and delegates execution.',
    detailedExplanation: 'Serves as the architectural bridge connecting the servlet container (Tomcat) lifecycle to the Spring ApplicationContext. Tomcat initializes before Spring\'s root WebApplicationContext is ready; DelegatingFilterProxy registers in web.xml / Servlet 3.0 as a standard Filter, and upon the first request, lazily looks up the target Spring bean ("springSecurityFilterChain") from WebApplicationContextUtils and delegates execution.',
    precedes: 'FilterChainProxy and all Spring Security filters.',
    succeeds: 'Standard Tomcat Container Filters (CharacterEncoding, CORS).',
    failureMode: 'Throws IllegalStateException: "No WebApplicationContext found" if initialized before Spring context bootstrap completes or if the targetBeanName does not match any Spring bean.',
    mutatesThreadLocal: 'None',
    configHook: 'spring.security.filter.order=-100 (Spring Boot auto-config)',
    codeSnippet: `// org.springframework.web.filter.DelegatingFilterProxy
@Override
public void doFilter(ServletRequest request, ServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
    Filter delegateToUse = this.delegate;
    if (delegateToUse == null) {
        WebApplicationContext wac = findWebApplicationContext();
        delegateToUse = initDelegate(wac);
        this.delegate = delegateToUse;
    }
    invokeDelegate(delegateToUse, request, response, filterChain);
}`,
    nodeId: 'delegating_filter_proxy'
  },
  {
    order: 4,
    name: 'FilterChainProxy',
    className: 'org.springframework.security.web.FilterChainProxy',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Spring Security central dispatcher. Matches incoming URL to configured SecurityFilterChain beans.',
    detailedExplanation: 'The central entry point and dispatcher of Spring Security. Maintains a List<SecurityFilterChain>. For each incoming request, it iterates through configured RequestMatcher instances (e.g., /api/** vs /admin/** vs /actuator/**) and dispatches the request to the matching specific filter chain. It also ensures that SecurityContextHolder is unconditionally cleared in a finally block to prevent thread contamination.',
    precedes: 'All 15 internal Spring Security filters.',
    succeeds: 'DelegatingFilterProxy',
    failureMode: 'Order of multiple SecurityFilterChain beans matters: higher priority chains (@Order(1)) match first; a catch-all chain without a matcher at @Order(1) will starve more specific subsequent chains.',
    mutatesThreadLocal: 'SecurityContextHolder (cleans up in finally block)',
    configHook: '@EnableWebSecurity / SecurityFilterChain @Bean',
    codeSnippet: `// org.springframework.security.web.FilterChainProxy
@Override
public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
    try {
        List<Filter> filters = getFilters(request);
        VirtualFilterChain vfc = new VirtualFilterChain(chain, filters);
        vfc.doFilter(request, response);
    } finally {
        this.securityContextHolderStrategy.clearContext();
        this.requestCache.resetRequest(request);
    }
}`,
    nodeId: 'filter_chain_proxy'
  },
  {
    order: 5,
    name: 'SecurityContextHolderFilter',
    className: 'org.springframework.security.web.context.SecurityContextHolderFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Loads SecurityContext from repository (Session or Token) into ThreadLocal SecurityContextHolder. Clears it on request completion.',
    detailedExplanation: 'Loads the SecurityContext from a SecurityContextRepository (e.g., HttpSession or RequestAttribute) and sets it on the ThreadLocal SecurityContextHolder. Crucially, unlike the legacy SecurityContextPersistenceFilter, it uses a Supplier<SecurityContext> to defer context loading until actually requested, avoiding unnecessary session queries. Always clears the ThreadLocal in a finally block upon completion.',
    precedes: 'All authentication and authorization filters.',
    succeeds: 'FilterChainProxy',
    failureMode: 'Failure to clear ThreadLocal leads to thread pool pollution in Tomcat where subsequent requests on recycled worker threads inherit the previous user\'s authenticated principal.',
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
    order: 6,
    name: 'HeaderWriterFilter',
    className: 'org.springframework.security.web.header.HeaderWriterFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Injects defensive security headers (X-Content-Type-Options: nosniff, X-Frame-Options: DENY, HSTS).',
    detailedExplanation: 'Applies defensive security headers to the HttpServletResponse: X-Content-Type-Options: nosniff (prevents MIME type sniffing attacks), X-Frame-Options: DENY or SAMEORIGIN (prevents clickjacking), Strict-Transport-Security (HSTS for HTTPS enforcement), and Content-Security-Policy (CSP).',
    precedes: 'Authentication filters (so even unauthorized error responses carry defensive headers).',
    succeeds: 'SecurityContextHolderFilter',
    failureMode: 'Embedding Spring Boot UI / iframe inside external customer portals fails with X-Frame-Options DENY unless explicitly relaxed via http.headers(h -> h.frameOptions(f -> f.sameOrigin())).',
    mutatesThreadLocal: 'None',
    configHook: 'http.headers(headers -> headers.frameOptions(f -> f.sameOrigin()))',
    codeSnippet: `// Configures OWASP defensive response headers
http.headers(headers -> headers
    .xssProtection(Customizer.withDefaults())
    .contentSecurityPolicy(cps -> cps.policyDirectives("default-src 'self'"))
    .frameOptions(frame -> frame.sameOrigin())
);`
  },
  {
    order: 7,
    name: 'CsrfFilter',
    className: 'org.springframework.security.web.csrf.CsrfFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Validates CSRF token header for state-mutating verbs (POST, PUT, DELETE). Rejects forged cross-site requests.',
    detailedExplanation: 'Protects against Cross-Site Request Forgery attacks. Inspects state-changing HTTP methods (POST, PUT, DELETE, PATCH). Compares the CSRF token passed in the request header (X-XSRF-TOKEN) or parameter against the token stored in HttpSession or cookie (CookieCsrfTokenRepository). If missing or mismatched, halts the chain and throws InvalidCsrfTokenException (HTTP 403 Forbidden).',
    precedes: 'Authentication filters and DispatcherServlet.',
    succeeds: 'HeaderWriterFilter',
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
    order: 8,
    name: 'LogoutFilter',
    className: 'org.springframework.security.web.authentication.logout.LogoutFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Catches /logout requests, invalidates session, clears cookies, and clears SecurityContextHolder.',
    detailedExplanation: 'Intercepts requests matching the logout URL (POST /logout by default). Delegates to a composite of LogoutHandler instances (SecurityContextLogoutHandler, CookieClearingLogoutHandler, HeaderWriterLogoutHandler) which clear the SecurityContext, invalidate the HttpSession, remove remember-me tokens, and redirect to the logout success URL.',
    precedes: 'Authentication filters (so logout occurs before credentials are evaluated).',
    succeeds: 'CsrfFilter',
    failureMode: 'In Spring Security 6, GET /logout is disallowed by default (requires POST) to prevent CSRF logout attacks; sending GET /logout results in 404/405 without logging out.',
    mutatesThreadLocal: 'SecurityContextHolder.clearContext()',
    configHook: 'http.logout(logout -> logout.logoutUrl("/logout").deleteCookies("JSESSIONID"))',
    codeSnippet: `// Configures logout endpoints and handlers
http.logout(logout -> logout
    .logoutUrl("/auth/logout")
    .logoutSuccessHandler((req, res, auth) -> res.setStatus(HttpServletResponse.SC_OK))
    .invalidateHttpSession(true)
    .clearAuthentication(true)
);`
  },
  {
    order: 9,
    name: 'BearerTokenAuthenticationFilter',
    className: 'org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Extracts Bearer <JWT> from Authorization header, verifies signature via JwtDecoder, and binds authenticated Principal.',
    detailedExplanation: 'Resource Server OAuth2 / JWT authentication filter. Reads the "Authorization: Bearer <token>" header using DefaultBearerTokenResolver. Passes the token string to the configured AuthenticationManager (which delegates to JwtAuthenticationProvider). Uses Nimbus / Spring Security JwtDecoder to verify cryptographic signature, expiration (exp), issuer (iss), and claims, converting them into a JwtAuthenticationToken stored in SecurityContextHolder.',
    precedes: 'AnonymousAuthenticationFilter, ExceptionTranslationFilter, AuthorizationFilter.',
    succeeds: 'LogoutFilter',
    failureMode: 'Expired JWTs or server clock skew (>60s) throw JwtValidationException, which is caught and transformed into 401 Unauthorized with WWW-Authenticate: Bearer error="invalid_token".',
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
    order: 10,
    name: 'UsernamePasswordAuthenticationFilter',
    className: 'org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Extracts username and password from POST /login form submissions and delegates to AuthenticationManager.',
    detailedExplanation: 'Standard form-based login processor. Intercepts POST requests matching "/login". Extracts "username" and "password" request parameters, packages them into an unauthenticated UsernamePasswordAuthenticationToken, and calls AuthenticationManager.authenticate(). On success, delegates to SavedRequestAwareAuthenticationSuccessHandler; on failure, delegates to SimpleUrlAuthenticationFailureHandler.',
    precedes: 'RequestCacheAwareFilter, AnonymousAuthenticationFilter.',
    succeeds: 'BearerTokenAuthenticationFilter',
    failureMode: 'Sending credentials via JSON body { "username": "..." } instead of application/x-www-form-urlencoded fails to trigger this filter by default without a custom AbstractAuthenticationProcessingFilter.',
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
    order: 11,
    name: 'RequestCacheAwareFilter',
    className: 'org.springframework.security.web.savedrequest.RequestCacheAwareFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Replays the original cached request URL that was interrupted by a login redirect.',
    detailedExplanation: 'Replays previously saved requests. When an unauthenticated user attempts to access a protected URL (e.g. GET /dashboard), Spring intercepts them and saves the request into HttpSessionRequestCache before redirecting to login. Once login succeeds, this filter checks the cache, extracts the original request, and wraps it so the user lands on their originally intended destination.',
    precedes: 'SecurityContextHolderAwareRequestFilter.',
    succeeds: 'UsernamePasswordAuthenticationFilter',
    failureMode: 'In single-page applications (SPA) or stateless APIs, request caching is unnecessary and can cause stale state; configure http.requestCache(c -> c.nullRequestCache()) to save memory.',
    mutatesThreadLocal: 'None',
    configHook: 'http.requestCache(c -> c.nullRequestCache())',
    codeSnippet: `// Disable saved request cache for stateless REST APIs
http.requestCache(cache -> cache
    .requestCache(new NullRequestCache())
);`
  },
  {
    order: 12,
    name: 'SecurityContextHolderAwareRequestFilter',
    className: 'org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Wraps HttpServletRequest so standard Servlet methods like request.isUserInRole() consult Spring Security.',
    detailedExplanation: 'Wraps the native HttpServletRequest with SecurityContextHolderAwareRequestWrapper. This allows legacy standard Servlet API methods (such as request.isUserInRole("ROLE_ADMIN"), request.getUserPrincipal(), and request.authenticate()) to seamlessly query the Spring Security context without coupling code directly to Spring Security classes.',
    precedes: 'AnonymousAuthenticationFilter.',
    succeeds: 'RequestCacheAwareFilter',
    failureMode: 'If custom filters unwrap or replace the HttpServletRequest downstream, calls to request.isUserInRole() may revert to Tomcat container realm behavior instead of Spring Security roles.',
    mutatesThreadLocal: 'Wraps HttpServletRequest with SecurityContextHolderAwareRequestWrapper',
    configHook: 'Default enabled in WebSecurityConfiguration',
    codeSnippet: `// Allows standard Servlet APIs to delegate to Spring Security:
// boolean isAdmin = request.isUserInRole("ADMIN");
// Principal principal = request.getUserPrincipal();`
  },
  {
    order: 13,
    name: 'AnonymousAuthenticationFilter',
    className: 'org.springframework.security.web.authentication.AnonymousAuthenticationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Assigns an AnonymousAuthenticationToken if no authentication is present, avoiding null checks.',
    detailedExplanation: 'Ensures that every request passing through the security filter chain has a non-null Authentication object. If SecurityContextHolder.getContext().getAuthentication() is null (meaning no prior filter authenticated the caller), it creates an AnonymousAuthenticationToken with principal "anonymousUser" and authority "ROLE_ANONYMOUS". This eliminates tedious null checks across downstream interceptors and controllers.',
    precedes: 'ExceptionTranslationFilter and AuthorizationFilter.',
    succeeds: 'SecurityContextHolderAwareRequestFilter',
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
    order: 14,
    name: 'ExceptionTranslationFilter',
    className: 'org.springframework.security.web.access.ExceptionTranslationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Catches AccessDeniedException (returns 403) and AuthenticationException (starts 401 / login challenge).',
    detailedExplanation: 'Architectural bridge between downstream security exceptions and HTTP responses. Sits directly above AuthorizationFilter in the chain, executing in a try-catch block. Catches AuthenticationException (initiating AuthenticationEntryPoint to trigger 401 or redirect to login) and AccessDeniedException (delegating to AccessDeniedHandler to return 403 Forbidden).',
    precedes: 'AuthorizationFilter.',
    succeeds: 'AnonymousAuthenticationFilter',
    failureMode: 'Exceptions thrown in filters situated ABOVE ExceptionTranslationFilter (e.g., custom filter at position 4) are NOT caught by ExceptionTranslationFilter and bypass custom 401/403 handlers, resulting in raw 500 error pages.',
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
    order: 15,
    name: 'AuthorizationFilter',
    className: 'org.springframework.security.web.access.intercept.AuthorizationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Final security barrier: checks AuthorizationManager rules before request enters DispatcherServlet.',
    detailedExplanation: 'The final security authorization checkpoint before the request reaches DispatcherServlet. Evaluates the request against configured AuthorizationManager rules (e.g., .requestMatchers("/admin/**").hasRole("ADMIN"), .anyRequest().authenticated()). If authorization fails, throws AccessDeniedException which is immediately caught by the preceding ExceptionTranslationFilter.',
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
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [copiedPromptOrder, setCopiedPromptOrder] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  if (!isOpen) return null;

  const filtered = ALL_SPRING_FILTERS.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.className.toLowerCase().includes(search.toLowerCase()) ||
      f.whatItDoes.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase()) ||
      f.detailedExplanation.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyPrompt = (filter: FilterEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = generateFilterPrompt(filter);
    navigator.clipboard.writeText(prompt);
    setCopiedPromptOrder(filter.order);
    setTimeout(() => setCopiedPromptOrder(null), 2500);
  };

  const handleCopyAllFiltersPrompt = () => {
    const prompt = `You are a Principal Spring Security & Servlet Internals Architect.

Please give me an exhaustive, production-grade master-class explanation of the entire Spring Boot Servlet & Spring Security Filter Chain pipeline.

Here is the exact order of all 15 canonical filters in modern Spring Boot 3.x / Spring 6:
${ALL_SPRING_FILTERS.map((f) => `${f.order}. [${f.location}] ${f.name} (${f.className}) - ${f.whatItDoes}`).join('\n')}

PLEASE EXPLAIN IN DEPTH:
1. The architectural transition from Tomcat Servlet Container -> DelegatingFilterProxy -> FilterChainProxy -> SecurityFilterChain.
2. The exact role, ThreadLocal lifecycle, and ordering necessity of each filter.
3. Why ExceptionTranslationFilter sits immediately above AuthorizationFilter.
4. Top 5 production gotchas (CORS preflight 403, CSRF in stateless APIs, ThreadLocal leakage, async dispatch, session fixation).
5. How to debug filter execution step-by-step with Spring Security debug logging.`;

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
                  Spring Security 6.x / Spring Boot 3.x
                </span>
              </div>
              <p className="text-xs text-[#8b949e]">
                Every container filter, bridge, and all 15 security filters in exact runtime execution order with deep-dive mechanics
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

        {/* Search bar & Architecture Explanation */}
        <div className="px-5 py-3 bg-[#161b22] border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search filters by name, class, ThreadLocal, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-[#8b949e]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Tomcat Container
            </span>
            <span className="text-[#30363d]">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              Delegating Bridge
            </span>
            <span className="text-[#30363d]">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Spring Security Chain
            </span>
          </div>
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
                    <span className="w-8 h-8 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-[#92ec56] flex-shrink-0 mt-0.5">
                      #{filter.order}
                    </span>

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
            <span>Showing {filtered.length} of {ALL_SPRING_FILTERS.length} canonical Spring filters</span>
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
