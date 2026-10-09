import type { SpringComponentNode, GraphEdge, SimulationScenario } from './types';

export const SPRING_NODES: SpringComponentNode[] = [
  // =========================================================================
  // VIEW 1: WEB REQUEST PIPELINE & DISPATCHER
  // =========================================================================
  {
    id: 'client_request',
    name: 'Client HTTP Request',
    simpleName: 'HTTP Client',
    package: 'external.network',
    category: 'SERVER',
    layer: 'Network & Web Container',
    roleSummary: 'Initiates HTTP/HTTPS TCP socket request to the Spring Boot server port (e.g. 8080).',
    lowLevelExplanation: 'Client sends raw HTTP/1.1 or HTTP/2 frame containing HTTP Verb, URL Path, Query Params, Headers (Authorization, Cookie, Content-Type), and Payload bytes.',
    executionOrder: 1,
    methods: [
      { name: 'TCP Handshake', signature: 'SYN -> SYN-ACK -> ACK', description: 'Establishes TCP connection with server host.' },
      { name: 'HTTP Frame', signature: 'GET /api/orders HTTP/1.1', description: 'Transmits request headers and body payload.' }
    ],
    codeSnippet: `GET /api/orders/42 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
Content-Type: application/json
Accept: application/json`,
    pitfalls: [
      'Sending mismatching Content-Type header triggers HttpMediaTypeNotSupportedException in Spring.',
      'Missing Host header in HTTP/1.1 results in 400 Bad Request before hitting Spring Dispatcher.'
    ],
    interviewQuestions: [
      {
        question: 'What happens at the OS socket level when a client connects to Spring Boot?',
        answer: 'The Linux OS kernel completes TCP 3-way handshake and places the socket in the SYN backlog/accept queue of the listening port, awaiting Tomcat Acceptor thread pickup.'
      }
    ],
    configLevers: [
      'server.port=8080',
      'server.tomcat.threads.max=200',
      'server.tomcat.accept-count=100'
    ],
    x: 40,
    y: 80,
    width: 220,
    height: 120,
    tags: ['Network', 'TCP', 'HTTP'],
    viewModes: ['WEB_REQUEST_PIPELINE', 'SECURITY_FILTER_CHAIN']
  },
  {
    id: 'tomcat_nio_connector',
    name: 'Tomcat Http11NioProtocol (Acceptor & Poller)',
    simpleName: 'Tomcat NIO Connector',
    package: 'org.apache.coyote.http11.Http11NioProtocol',
    category: 'SERVER',
    layer: 'Network & Web Container',
    roleSummary: 'Embedded Tomcat non-blocking I/O connector handling socket acceptance and thread dispatch.',
    lowLevelExplanation: 'Uses a dedicated Acceptor thread to call serverSocket.accept(), hands the SocketChannel to a Poller thread (using Java NIO Selector), which dispatches to a Worker thread pool (ThreadPoolExecutor) when data is readable.',
    executionOrder: 2,
    methods: [
      { name: 'Acceptor.run()', signature: 'void run()', description: 'Loops on ServerSocketChannel.accept() to receive incoming connections.' },
      { name: 'Poller.processKey()', signature: 'boolean processKey(SelectionKey sk, NioSocketWrapper socketWrapper)', description: 'Registers OP_READ/OP_WRITE events on NIO Selector.' },
      { name: 'Http11Processor.service()', signature: 'SocketState service(SocketWrapperBase<?> socketWrapper)', description: 'Parses HTTP headers, creates Coyote Request/Response, passes to StandardEngine.' }
    ],
    codeSnippet: `// Tomcat Internal: org.apache.tomcat.util.net.NioEndpoint
public class Acceptor implements Runnable {
    @Override
    public void run() {
        while (endpoint.isRunning()) {
            SocketChannel socket = serverSocketChannel.accept();
            endpoint.setSocketOptions(socket);
        }
    }
}`,
    pitfalls: [
      'Worker thread pool exhaustion causes requests to queue in accept-count until socket timeout occurs.',
      'Blocking operations on worker threads degrade throughput drastically in standard Servlet containers.'
    ],
    interviewQuestions: [
      {
        question: 'How does Spring Boot default embedded Tomcat handle 10,000 concurrent idle keep-alive connections?',
        answer: 'Via NIO Poller Selector threads. Idle sockets are held in NIO Selector without consuming worker threads. Only when bytes arrive is a worker thread pulled from the pool.'
      }
    ],
    configLevers: [
      'server.tomcat.threads.min-spare=10',
      'server.tomcat.threads.max=200',
      'server.tomcat.connection-timeout=20000'
    ],
    x: 300,
    y: 80,
    width: 260,
    height: 130,
    tags: ['Tomcat', 'NIO', 'Threads', 'Embedded'],
    viewModes: ['WEB_REQUEST_PIPELINE']
  },
  {
    id: 'application_filter_chain',
    name: 'ApplicationFilterChain (Tomcat StandardContext)',
    simpleName: 'ApplicationFilterChain',
    package: 'org.apache.catalina.core.ApplicationFilterChain',
    category: 'SERVLET_FILTER',
    layer: 'Servlet Filter Pipeline',
    roleSummary: 'Standard Java EE / Jakarta Servlet FilterChain implementation coordinating servlet filters.',
    lowLevelExplanation: 'Maintains an array of FilterConfig instances and an integer index (pos). Each filter.doFilter(req, res, chain) increments pos. When pos reaches the end of the filter list, it calls servlet.service(req, res).',
    executionOrder: 3,
    methods: [
      { name: 'doFilter', signature: 'void doFilter(ServletRequest request, ServletResponse response)', description: 'Advances index pos and executes next Filter or target Servlet.' },
      { name: 'internalDoFilter', signature: 'private void internalDoFilter(ServletRequest req, ServletResponse res)', description: 'Retrieves filter at index pos and invokes its doFilter method.' }
    ],
    codeSnippet: `// org.apache.catalina.core.ApplicationFilterChain
private void internalDoFilter(ServletRequest request, ServletResponse response) {
    if (this.pos < this.n) {
        ApplicationFilterConfig filterConfig = this.filters[this.pos++];
        Filter filter = filterConfig.getFilter();
        filter.doFilter(request, response, this);
        return;
    }
    // When filters are exhausted, dispatch to the Servlet!
    this.servlet.service(request, response);
}`,
    pitfalls: [
      'Forgetting to call chain.doFilter(request, response) halts the request completely, returning an empty response with no error trace.',
      'Modifying request headers requires wrapping HttpServletRequest with HttpServletRequestWrapper.'
    ],
    interviewQuestions: [
      {
        question: 'What design pattern does ApplicationFilterChain implement?',
        answer: 'Chain of Responsibility pattern (combined with Decorator pattern when wrappers are applied).'
      }
    ],
    configLevers: [
      'FilterRegistrationBean<MyFilter> bean with setOrder(Ordered.HIGHEST_PRECEDENCE)'
    ],
    x: 600,
    y: 80,
    width: 260,
    height: 130,
    tags: ['Servlet', 'FilterChain', 'Filter'],
    viewModes: ['WEB_REQUEST_PIPELINE', 'SECURITY_FILTER_CHAIN']
  },
  {
    id: 'character_encoding_filter',
    name: 'CharacterEncodingFilter',
    simpleName: 'Encoding Filter',
    package: 'org.springframework.web.filter.CharacterEncodingFilter',
    category: 'SERVLET_FILTER',
    layer: 'Servlet Filter Pipeline',
    roleSummary: 'Forces UTF-8 character encoding on the incoming HttpServletRequest and HttpServletResponse.',
    lowLevelExplanation: 'Extends OncePerRequestFilter. Invokes request.setCharacterEncoding("UTF-8") before any parameter parsing occurs. If forceResponseEncoding is true, sets response.setCharacterEncoding as well.',
    executionOrder: 4,
    methods: [
      { name: 'doFilterInternal', signature: 'protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)', description: 'Applies request.setCharacterEncoding(this.encoding).' }
    ],
    codeSnippet: `// org.springframework.web.filter.CharacterEncodingFilter
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) {
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
    pitfalls: [
      'If request.getParameter() is called BEFORE CharacterEncodingFilter runs, the container locks the encoding and setCharacterEncoding() has zero effect.'
    ],
    interviewQuestions: [
      {
        question: 'Why must CharacterEncodingFilter be ordered as the highest precedence filter?',
        answer: 'Servlet specifications dictate that once request body parsing begins (e.g. getParameter or getReader), character encoding cannot be modified.'
      }
    ],
    configLevers: [
      'server.servlet.encoding.charset=UTF-8',
      'server.servlet.encoding.force=true'
    ],
    x: 900,
    y: 80,
    width: 250,
    height: 130,
    tags: ['Filter', 'Encoding', 'UTF8'],
    viewModes: ['WEB_REQUEST_PIPELINE']
  },
  {
    id: 'delegating_filter_proxy',
    name: 'DelegatingFilterProxy',
    simpleName: 'DelegatingFilterProxy',
    package: 'org.springframework.web.filter.DelegatingFilterProxy',
    category: 'SERVLET_FILTER',
    layer: 'Bridge Layer (Servlet to Spring)',
    roleSummary: 'Crucial bridge connecting the standard Servlet Container lifecycle to the Spring ApplicationContext.',
    lowLevelExplanation: 'Servlet filters are managed by Tomcat, but Spring Security is managed by Spring IoC. DelegatingFilterProxy is registered in Tomcat and lazily looks up a target Spring Bean (by default "springSecurityFilterChain") from WebApplicationContext, delegating all calls to it.',
    executionOrder: 5,
    methods: [
      { name: 'doFilter', signature: 'void doFilter(ServletRequest request, ServletResponse response, FilterChain filterChain)', description: 'Lazily resolves delegate bean and invokes delegate.doFilter().' },
      { name: 'initDelegate', signature: 'protected Filter initDelegate(WebApplicationContext wac)', description: 'Retrieves bean "springSecurityFilterChain" from WebApplicationContext.' }
    ],
    codeSnippet: `// org.springframework.web.filter.DelegatingFilterProxy
public void doFilter(ServletRequest request, ServletResponse response, FilterChain filterChain) {
    Filter delegateToUse = this.delegate;
    if (delegateToUse == null) {
        WebApplicationContext wac = findWebApplicationContext();
        delegateToUse = wac.getBean(getTargetBeanName(), Filter.class);
        this.delegate = delegateToUse;
    }
    delegateToUse.doFilter(request, response, filterChain);
}`,
    pitfalls: [
      'If the ApplicationContext fails to start, DelegatingFilterProxy throws IllegalStateException: No WebApplicationContext found.'
    ],
    interviewQuestions: [
      {
        question: 'Why does Spring Security need DelegatingFilterProxy instead of directly registering security filters in Tomcat?',
        answer: 'Tomcat initializes servlet filters before Spring ApplicationContext is created. DelegatingFilterProxy allows Spring Security filters to be managed as Spring Beans with full DI, AOP, and lifecycle support.'
      }
    ],
    configLevers: [
      'spring.security.filter.order=-100',
      'AbstractSecurityWebApplicationInitializer'
    ],
    x: 1190,
    y: 80,
    width: 270,
    height: 130,
    tags: ['Bridge', 'Security', 'Delegation', 'ServletContainer'],
    viewModes: ['WEB_REQUEST_PIPELINE', 'SECURITY_FILTER_CHAIN']
  },
  {
    id: 'filter_chain_proxy',
    name: 'FilterChainProxy (springSecurityFilterChain)',
    simpleName: 'FilterChainProxy',
    package: 'org.springframework.security.web.FilterChainProxy',
    category: 'SECURITY_FILTER',
    layer: 'Spring Security Subsystem',
    roleSummary: 'Spring Security central dispatcher. Matches request against configured SecurityFilterChain instances.',
    lowLevelExplanation: 'Contains a List<SecurityFilterChain>. Iterates through them to find the first SecurityFilterChain whose RequestMatcher matches the current HttpServletRequest. It then wraps those security filters into a VirtualFilterChain and begins execution.',
    executionOrder: 6,
    methods: [
      { name: 'doFilter', signature: 'void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)', description: 'Clears SecurityContext upon completion if required and dispatches through VirtualFilterChain.' },
      { name: 'getFilters', signature: 'private List<Filter> getFilters(HttpServletRequest request)', description: 'Finds matching SecurityFilterChain for the request URI.' }
    ],
    codeSnippet: `// org.springframework.security.web.FilterChainProxy
public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
    List<Filter> filters = getFilters((HttpServletRequest) request);
    if (filters == null || filters.isEmpty()) {
        chain.doFilter(request, response);
        return;
    }
    VirtualFilterChain vfc = new VirtualFilterChain(chain, filters);
    vfc.doFilter(request, response);
}`,
    pitfalls: [
      'If multiple SecurityFilterChain beans exist with identical or overlapping RequestMatchers, only the first one with higher precedence runs; lower ones are skipped.'
    ],
    interviewQuestions: [
      {
        question: 'What is the bean name of FilterChainProxy in Spring Context?',
        answer: '"springSecurityFilterChain" by convention, registered by @EnableWebSecurity or SecurityAutoConfiguration.'
      }
    ],
    configLevers: [
      '@Bean SecurityFilterChain securityFilterChain(HttpSecurity http)',
      '@Order(1) on multiple SecurityFilterChain beans'
    ],
    x: 1500,
    y: 80,
    width: 280,
    height: 130,
    tags: ['Security', 'Router', 'VirtualFilterChain'],
    viewModes: ['WEB_REQUEST_PIPELINE', 'SECURITY_FILTER_CHAIN']
  },

  // -------------------------------------------------------------------------
  // SPRING SECURITY CORE FILTERS (Inside SecurityFilterChain)
  // -------------------------------------------------------------------------
  {
    id: 'sec_filter_context',
    name: 'SecurityContextHolderFilter',
    simpleName: '1. SecurityContextHolderFilter',
    package: 'org.springframework.security.web.context.SecurityContextHolderFilter',
    category: 'SECURITY_FILTER',
    layer: 'Spring Security Filter Pipeline',
    roleSummary: 'Loads SecurityContext from SecurityContextRepository into ThreadLocal SecurityContextHolder.',
    lowLevelExplanation: 'In Spring Security 6, replaced SecurityContextPersistenceFilter. Loads existing SecurityContext (from HttpSession or header) and sets it in SecurityContextHolder. Guarantees cleaning up ThreadLocal on request completion via a finally block.',
    executionOrder: 7,
    methods: [
      { name: 'doFilter', signature: 'void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)', description: 'Loads SecurityContext, wraps in supplier, clears on finally.' }
    ],
    codeSnippet: `// org.springframework.security.web.context.SecurityContextHolderFilter
Supplier<SecurityContext> deferredContext = this.securityContextRepository.loadDeferredContext(request);
this.securityContextHolderStrategy.setDeferredContext(deferredContext);
try {
    chain.doFilter(request, response);
} finally {
    this.securityContextHolderStrategy.clearContext();
}`,
    pitfalls: [
      'Thread pool reuse in Tomcat: if clearContext() fails to run, a subsequent unrelated request reusing the worker thread might inherit another user credentials.'
    ],
    interviewQuestions: [
      {
        question: 'Why did Spring Security 6 replace SecurityContextPersistenceFilter with SecurityContextHolderFilter?',
        answer: 'To avoid eagerly reading the HttpSession if the request does not actually require security context. It uses deferred loading (Supplier<SecurityContext>) for better performance.'
      }
    ],
    configLevers: [
      'http.securityContext(context -> context.requireExplicitSave(true))'
    ],
    x: 1820,
    y: 80,
    width: 280,
    height: 130,
    tags: ['Security', 'ThreadLocal', 'Session', 'SecurityContext'],
    viewModes: ['WEB_REQUEST_PIPELINE', 'SECURITY_FILTER_CHAIN']
  },
  {
    id: 'sec_filter_csrf',
    name: 'CsrfFilter',
    simpleName: '2. CsrfFilter',
    package: 'org.springframework.security.web.csrf.CsrfFilter',
    category: 'SECURITY_FILTER',
    layer: 'Spring Security Filter Pipeline',
    roleSummary: 'Protects state-modifying requests (POST, PUT, DELETE, PATCH) against Cross-Site Request Forgery.',
    lowLevelExplanation: 'Checks if HTTP verb is read-only (GET, HEAD, TRACE, OPTIONS). If state-changing, retrieves token from request header/parameter and compares with expected token in CsrfTokenRepository. Throws InvalidCsrfTokenException (403) on mismatch.',
    executionOrder: 8,
    methods: [
      { name: 'doFilterInternal', signature: 'protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)', description: 'Validates CSRF token for unsafe HTTP verbs.' }
    ],
    codeSnippet: `// org.springframework.security.web.csrf.CsrfFilter
if (!this.requireCsrfProtectionMatcher.matches(request)) {
    filterChain.doFilter(request, response);
    return;
}
String actualToken = request.getHeader(csrfToken.getHeaderName());
if (!csrfToken.getToken().equals(actualToken)) {
    this.accessDeniedHandler.handle(request, response, new InvalidCsrfTokenException(csrfToken, actualToken));
    return;
}`,
    pitfalls: [
      'Stateless REST APIs using JWT must explicitly disable CSRF via http.csrf(csrf -> csrf.disable()), otherwise all POST/PUT requests fail with 403 Forbidden.'
    ],
    interviewQuestions: [
      {
        question: 'Why do stateless token-based APIs (JWT in Authorization header) not need CSRF protection?',
        answer: 'CSRF exploits automatic browser cookie submission across domains. If auth tokens are stored in JS memory and sent via explicit Authorization header, malicious sites cannot forge that header.'
      }
    ],
    configLevers: [
      'http.csrf(csrf -> csrf.disable())',
      'CookieCsrfTokenRepository.withHttpOnlyFalse()'
    ],
    x: 2140,
    y: 80,
    width: 260,
    height: 130,
    tags: ['Security', 'CSRF', 'Protection', 'HTTP'],
    viewModes: ['SECURITY_FILTER_CHAIN']
  },
  {
    id: 'sec_filter_auth',
    name: 'BearerTokenAuthenticationFilter',
    simpleName: '3. BearerTokenAuthFilter',
    package: 'org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter',
    category: 'SECURITY_FILTER',
    layer: 'Spring Security Filter Pipeline',
    roleSummary: 'Extracts Bearer token (JWT) from Authorization header and delegates to AuthenticationManager.',
    lowLevelExplanation: 'Resolves token string from header (Bearer <jwt>), constructs BearerTokenAuthenticationToken, calls AuthenticationManager.authenticate(token), and stores authenticated JwtAuthenticationToken in SecurityContextHolder.',
    executionOrder: 9,
    methods: [
      { name: 'doFilterInternal', signature: 'protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)', description: 'Extracts Bearer token, invokes authentication, saves to context.' }
    ],
    codeSnippet: `// BearerTokenAuthenticationFilter
String token = this.bearerTokenResolver.resolve(request);
if (token != null) {
    Authentication authRequest = new BearerTokenAuthenticationToken(token);
    Authentication authResult = this.authenticationManager.authenticate(authRequest);
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authResult);
    SecurityContextHolder.setContext(context);
}
filterChain.doFilter(request, response);`,
    pitfalls: [
      'Clock skew on JWT validation: Expired tokens fail with 401 unless skew leeway is configured.',
      'Signature verification failure throws AuthenticationException handled by AuthenticationEntryPoint.'
    ],
    interviewQuestions: [
      {
        question: 'What is the role of AuthenticationManager and AuthenticationProvider in this flow?',
        answer: 'AuthenticationManager (typically ProviderManager) queries registered AuthenticationProviders (e.g. JwtAuthenticationProvider) to validate credentials, decode claims, and issue an authenticated principal.'
      }
    ],
    configLevers: [
      'http.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))'
    ],
    x: 2440,
    y: 80,
    width: 290,
    height: 130,
    tags: ['Security', 'JWT', 'OAuth2', 'BearerToken'],
    viewModes: ['SECURITY_FILTER_CHAIN']
  },
  {
    id: 'sec_filter_authz',
    name: 'AuthorizationFilter',
    simpleName: '4. AuthorizationFilter',
    package: 'org.springframework.security.web.access.intercept.AuthorizationFilter',
    category: 'SECURITY_FILTER',
    layer: 'Spring Security Filter Pipeline',
    roleSummary: 'Final security filter. Evaluates URL authorization rules (hasRole, authenticated, permitAll).',
    lowLevelExplanation: 'Replaced FilterSecurityInterceptor. Evaluates AuthorizationManager.check(supplier, request). If AuthorizationDecision.isGranted() is false, throws AccessDeniedException. If true, passes to chain.doFilter().',
    executionOrder: 10,
    methods: [
      { name: 'doFilter', signature: 'void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain)', description: 'Calls authorizationManager.check() and allows or denies access.' }
    ],
    codeSnippet: `// org.springframework.security.web.access.intercept.AuthorizationFilter
AuthorizationDecision decision = this.authorizationManager.check(this::getAuthentication, request);
if (decision != null && !decision.isGranted()) {
    throw new AccessDeniedException("Access Denied");
}
chain.doFilter(request, response);`,
    pitfalls: [
      'Rule order in HttpSecurity: authorizeHttpRequests(auth -> auth.anyRequest().authenticated().requestMatchers("/public").permitAll()) - permitAll is ignored because anyRequest() matches first!'
    ],
    interviewQuestions: [
      {
        question: 'How does AuthorizationFilter handle unauthenticated vs authenticated access denials?',
        answer: 'ExceptionTranslationFilter wraps this filter. If user is anonymous, it invokes AuthenticationEntryPoint (401 or redirect to login). If authenticated but lacking permissions, it invokes AccessDeniedHandler (403 Forbidden).'
      }
    ],
    configLevers: [
      'http.authorizeHttpRequests(auth -> auth.requestMatchers("/api/admin/**").hasRole("ADMIN"))'
    ],
    x: 2770,
    y: 80,
    width: 270,
    height: 130,
    tags: ['Security', 'Authorization', 'RBAC', 'AccessControl'],
    viewModes: ['SECURITY_FILTER_CHAIN']
  },

  // -------------------------------------------------------------------------
  // SPRING MVC DISPATCHER CORE (DispatcherServlet & Handlers)
  // -------------------------------------------------------------------------
  {
    id: 'dispatcher_servlet',
    name: 'DispatcherServlet (Spring MVC Front Controller)',
    simpleName: 'DispatcherServlet',
    package: 'org.springframework.web.servlet.DispatcherServlet',
    category: 'MVC_CORE',
    layer: 'DispatcherServlet Dispatch Core',
    roleSummary: 'Central Front Controller orchestrating HTTP request dispatching, handler mappings, adapters, and view/REST rendering.',
    lowLevelExplanation: 'Inherits FrameworkServlet -> HttpServletBean -> HttpServlet. Its pivotal method doDispatch(request, response) coordinates: 1) Multipart check, 2) getHandler() to find HandlerExecutionChain, 3) getHandlerAdapter(), 4) applyPreHandle() on interceptors, 5) handle() on adapter, 6) applyPostHandle(), 7) processDispatchResult() and triggerAfterCompletion().',
    executionOrder: 11,
    methods: [
      { name: 'doDispatch', signature: 'protected void doDispatch(HttpServletRequest request, HttpServletResponse response)', description: 'Central engine coordinating request dispatch lifecycle.' },
      { name: 'getHandler', signature: 'protected HandlerExecutionChain getHandler(HttpServletRequest request)', description: 'Queries all HandlerMappings for matching handler.' },
      { name: 'getHandlerAdapter', signature: 'protected HandlerAdapter getHandlerAdapter(Object handler)', description: 'Finds adapter capable of invoking handler (e.g. RequestMappingHandlerAdapter).' }
    ],
    codeSnippet: `// org.springframework.web.servlet.DispatcherServlet
protected void doDispatch(HttpServletRequest request, HttpServletResponse response) throws Exception {
    HttpServletRequest processedRequest = checkMultipart(request);
    HandlerExecutionChain mappedHandler = getHandler(processedRequest);
    HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());

    if (!mappedHandler.applyPreHandle(processedRequest, response)) {
        return; // Interceptor aborted request
    }
    ModelAndView mv = ha.handle(processedRequest, response, mappedHandler.getHandler());
    mappedHandler.applyPostHandle(processedRequest, response, mv);
    processDispatchResult(processedRequest, response, mappedHandler, mv, dispatchException);
}`,
    pitfalls: [
      'DispatcherServlet is a singleton; all instance fields must be thread-safe. Never store request-scoped mutable state on it.',
      'Unhandled runtime exceptions bubble up to processDispatchResult() -> HandlerExceptionResolver.'
    ],
    interviewQuestions: [
      {
        question: 'Walk through doDispatch() step by step from receiving a request to writing the response.',
        answer: '1. checkMultipart -> 2. getHandler (finds HandlerExecutionChain) -> 3. getHandlerAdapter -> 4. interceptor.preHandle() -> 5. adapter.handle() (argument resolvers + controller reflection) -> 6. interceptor.postHandle() -> 7. processDispatchResult (exception resolvers / message converters) -> 8. interceptor.afterCompletion().'
      }
    ],
    configLevers: [
      'spring.mvc.servlet.path=/',
      'spring.mvc.throw-exception-if-no-handler-found=true'
    ],
    x: 40,
    y: 280,
    width: 280,
    height: 150,
    tags: ['MVC', 'FrontController', 'doDispatch', 'Core'],
    viewModes: ['WEB_REQUEST_PIPELINE']
  },
  {
    id: 'handler_mapping',
    name: 'RequestMappingHandlerMapping',
    simpleName: 'HandlerMapping',
    package: 'org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping',
    category: 'HANDLER',
    layer: 'DispatcherServlet Dispatch Core',
    roleSummary: 'Maps incoming request URL path, HTTP method, and headers to a controller HandlerMethod.',
    lowLevelExplanation: 'Scans all Spring Beans on startup for @Controller or @RequestMapping annotations. Stores mappings in a MappingRegistry. At request time, matches request URL and returns a HandlerExecutionChain containing the target InvocableHandlerMethod and matching HandlerInterceptor instances.',
    executionOrder: 12,
    methods: [
      { name: 'getHandlerInternal', signature: 'protected HandlerMethod getHandlerInternal(HttpServletRequest request)', description: 'Looks up HandlerMethod from MappingRegistry using request URL and HTTP method.' },
      { name: 'getHandlerExecutionChain', signature: 'protected HandlerExecutionChain getHandlerExecutionChain(Object handler, HttpServletRequest request)', description: 'Appends matching interceptors to the HandlerExecutionChain.' }
    ],
    codeSnippet: `// RequestMappingHandlerMapping
protected HandlerMethod lookupHandlerMethod(String lookupPath, HttpServletRequest request) {
    List<Match> matches = this.mappingRegistry.getMatches(lookupPath);
    Match bestMatch = matches.get(0);
    handleMatch(bestMatch.mapping, lookupPath, request);
    return bestMatch.handlerMethod;
}`,
    pitfalls: [
      'Ambiguous mapping: two controller methods having identical path pattern and HTTP verb will throw IllegalStateException at startup.'
    ],
    interviewQuestions: [
      {
        question: 'What is inside a HandlerExecutionChain returned by HandlerMapping?',
        answer: 'It contains the target Handler (usually HandlerMethod pointing to the controller bean and Method object) plus an array/list of HandlerInterceptor instances matching the request path.'
      }
    ],
    configLevers: [
      'WebMvcConfigurer.addInterceptors(InterceptorRegistry registry)',
      'spring.mvc.pathmatch.matching-strategy=path-pattern-parser'
    ],
    x: 360,
    y: 280,
    width: 270,
    height: 140,
    tags: ['HandlerMapping', 'URLMapping', 'Routing'],
    viewModes: ['WEB_REQUEST_PIPELINE']
  },
  {
    id: 'handler_interceptor',
    name: 'HandlerInterceptor (preHandle / postHandle)',
    simpleName: 'HandlerInterceptor',
    package: 'org.springframework.web.servlet.HandlerInterceptor',
    category: 'HANDLER',
    layer: 'DispatcherServlet Dispatch Core',
    roleSummary: 'Spring MVC interceptor running before and after Controller execution.',
    lowLevelExplanation: 'Unlike Servlet Filters which wrap the entire servlet, HandlerInterceptors operate strictly inside DispatcherServlet with access to Spring HandlerMethod metadata. If preHandle() returns false, request processing halts and afterCompletion() is called for previously passed interceptors.',
    executionOrder: 13,
    methods: [
      { name: 'preHandle', signature: 'boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler)', description: 'Runs before controller; return true to proceed, false to abort.' },
      { name: 'postHandle', signature: 'void postHandle(HttpServletRequest req, HttpServletResponse res, Object handler, ModelAndView mv)', description: 'Runs after controller execution before view rendering (not called for @ResponseBody).' },
      { name: 'afterCompletion', signature: 'void afterCompletion(HttpServletRequest req, HttpServletResponse res, Object handler, Exception ex)', description: 'Runs after request processing is complete, ideal for resource cleanup.' }
    ],
    codeSnippet: `public class LoggingInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute("startTime", System.currentTimeMillis());
        return true; // continue chain
    }
    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res, Object handler, Exception ex) {
        long duration = System.currentTimeMillis() - (Long) req.getAttribute("startTime");
        log.info("Request finished in {} ms", duration);
    }
}`,
    pitfalls: [
      'postHandle() is not invoked when an exception occurs inside the Controller, but afterCompletion() is ALWAYS invoked.',
      'postHandle() cannot inspect the serialized JSON response body written by @ResponseBody (use ResponseBodyAdvice instead).'
    ],
    interviewQuestions: [
      {
        question: 'What is the fundamental architectural difference between a Servlet Filter and a HandlerInterceptor?',
        answer: 'Filter is a Java EE specification component running outside DispatcherServlet at container level (coarse-grained). HandlerInterceptor is a Spring MVC component running inside DispatcherServlet with direct access to Spring controller metadata (HandlerMethod).'
      }
    ],
    configLevers: [
      'registry.addInterceptor(new MyInterceptor()).addPathPatterns("/api/**")'
    ],
    x: 670,
    y: 280,
    width: 270,
    height: 140,
    tags: ['Interceptor', 'preHandle', 'afterCompletion'],
    viewModes: ['WEB_REQUEST_PIPELINE']
  },
  {
    id: 'handler_adapter',
    name: 'RequestMappingHandlerAdapter',
    simpleName: 'HandlerAdapter',
    package: 'org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter',
    category: 'HANDLER',
    layer: 'DispatcherServlet Dispatch Core',
    roleSummary: 'Adapter executing the Controller method using reflection and managing argument resolvers and return value handlers.',
    lowLevelExplanation: 'DispatcherServlet delegates the actual invocation of HandlerMethod to RequestMappingHandlerAdapter. It instantiates ServletInvocableHandlerMethod, initializes HandlerMethodArgumentResolverComposite and HandlerMethodReturnValueHandlerComposite.',
    executionOrder: 14,
    methods: [
      { name: 'handleInternal', signature: 'protected ModelAndView handleInternal(HttpServletRequest req, HttpServletResponse res, HandlerMethod handlerMethod)', description: 'Orchestrates parameter resolution and method invocation.' },
      { name: 'invokeHandlerMethod', signature: 'protected ModelAndView invokeHandlerMethod(HttpServletRequest req, HttpServletResponse res, HandlerMethod handlerMethod)', description: 'Creates ServletInvocableHandlerMethod and invokes it.' }
    ],
    codeSnippet: `// RequestMappingHandlerAdapter
ServletInvocableHandlerMethod invocableMethod = createInvocableHandlerMethod(handlerMethod);
invocableMethod.setHandlerMethodArgumentResolvers(this.argumentResolvers);
invocableMethod.setHandlerMethodReturnValueHandlers(this.returnValueHandlers);
invocableMethod.invokeAndHandle(webRequest, mavContainer);
return getModelAndView(mavContainer, modelFactory, webRequest);`,
    pitfalls: [
      'Custom argument resolvers must be registered via WebMvcConfigurer.addArgumentResolvers; adding them incorrectly can alter default resolution precedence.'
    ],
    interviewQuestions: [
      {
        question: 'Why does Spring MVC use HandlerAdapter instead of DispatcherServlet calling the controller directly?',
        answer: 'Adapter Pattern allows Spring MVC to support diverse handler types (e.g. @RequestMapping methods, HttpRequestHandler, SimpleControllerHandlerAdapter) without coupling DispatcherServlet to any specific programming model.'
      }
    ],
    configLevers: [
      'WebMvcConfigurer.addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers)',
      'WebMvcConfigurer.addReturnValueHandlers(List<HandlerMethodReturnValueHandler> handlers)'
    ],
    x: 980,
    y: 280,
    width: 280,
    height: 140,
    tags: ['HandlerAdapter', 'Reflection', 'AdapterPattern'],
    viewModes: ['WEB_REQUEST_PIPELINE']
  },
  {
    id: 'argument_resolvers',
    name: 'HandlerMethodArgumentResolverComposite',
    simpleName: 'Argument Resolvers',
    package: 'org.springframework.web.method.support.HandlerMethodArgumentResolverComposite',
    category: 'HANDLER',
    layer: 'Handler Execution & Conversion',
    roleSummary: 'Resolves controller method parameters from HTTP request (@RequestBody, @PathVariable, @RequestParam).',
    lowLevelExplanation: 'Iterates through registered resolvers (e.g. RequestResponseBodyMethodProcessor for @RequestBody, PathVariableMethodArgumentResolver). Calls supportsParameter(param). The first matching resolver calls resolveArgument() and deserializes the value.',
    executionOrder: 15,
    methods: [
      { name: 'resolveArgument', signature: 'Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer, NativeWebRequest webRequest, WebDataBinderFactory binderFactory)', description: 'Parses parameter value from request.' },
      { name: 'supportsParameter', signature: 'boolean supportsParameter(MethodParameter parameter)', description: 'Checks if resolver handles this parameter type/annotation.' }
    ],
    codeSnippet: `// RequestResponseBodyMethodProcessor
public Object resolveArgument(MethodParameter parameter, ...) {
    Object arg = readWithMessageConverters(webRequest, parameter, parameter.getNestedGenericParameterType());
    // Triggers Bean Validation (@Valid / @Validated)
    validateIfApplicable(binder, parameter);
    return arg;
}`,
    pitfalls: [
      '@RequestBody can only be read ONCE from the ServletInputStream because standard streams cannot be re-read without ContentCachingRequestWrapper.',
      'Missing @Valid causes request DTO validation constraints (@NotNull, @Size) to be silently skipped.'
    ],
    interviewQuestions: [
      {
        question: 'How does Spring read and validate a @RequestBody DTO?',
        answer: 'RequestResponseBodyMethodProcessor matches @RequestBody, delegates to HttpMessageConverter (e.g. Jackson) to deserialize JSON from InputStream, then binds errors to BindingResult if @Valid is present.'
      }
    ],
    configLevers: [
      'WebMvcConfigurer.addArgumentResolvers()',
      '@Valid / @Validated'
    ],
    x: 1300,
    y: 280,
    width: 290,
    height: 140,
    tags: ['ArgumentResolver', 'RequestBody', 'Validation', 'Jackson'],
    viewModes: ['WEB_REQUEST_PIPELINE']
  },
  {
    id: 'target_controller',
    name: 'Target Controller (@RestController)',
    simpleName: 'OrderController',
    package: 'com.example.controller.OrderController',
    category: 'CONTROLLER',
    layer: 'Business & Controller Layer',
    roleSummary: 'Application business endpoint receiving validated arguments and returning DTO or ResponseEntity.',
    lowLevelExplanation: '@RestController is a composite annotation of @Controller and @ResponseBody. Executed by Java reflection: method.invoke(controllerInstance, resolvedArgs). Calls business services, repositories, or external APIs.',
    executionOrder: 16,
    methods: [
      { name: 'getOrder', signature: '@GetMapping("/{id}") public ResponseEntity<OrderDto> getOrder(@PathVariable Long id)', description: 'Business logic endpoint returning order details.' }
    ],
    codeSnippet: `@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;

    @GetMapping("/{id}")
    public ResponseEntity<OrderDto> getOrder(@PathVariable Long id) {
        OrderDto order = orderService.findById(id);
        return ResponseEntity.ok(order);
    }
}`,
    pitfalls: [
      'Controllers should not contain business logic; they should strictly orchestrate HTTP inputs, call services, and return responses.',
      'Injecting prototype beans into a singleton controller without ObjectProvider or @Scope(proxyMode) causes the prototype to behave as a singleton.'
    ],
    interviewQuestions: [
      {
        question: 'Is a Spring @RestController thread-safe by default?',
        answer: 'Yes, because it is a singleton bean stateless by design. However, if an engineer adds instance state variables (mutable fields), it becomes thread-unsafe across concurrent requests.'
      }
    ],
    configLevers: [
      '@CrossOrigin',
      '@ResponseStatus',
      '@PreAuthorize("hasRole(\'USER\')")'
    ],
    x: 1630,
    y: 280,
    width: 260,
    height: 140,
    tags: ['RestController', 'Endpoint', 'BusinessLogic'],
    viewModes: ['WEB_REQUEST_PIPELINE', 'TRANSACTIONS_AND_DATA']
  },
  {
    id: 'return_value_handler',
    name: 'RequestResponseBodyMethodProcessor & Jackson',
    simpleName: 'Message Converter',
    package: 'org.springframework.http.converter.json.MappingJackson2HttpMessageConverter',
    category: 'HANDLER',
    layer: 'Handler Execution & Conversion',
    roleSummary: 'Serializes the return object into JSON bytes and writes directly to HttpServletResponse stream.',
    lowLevelExplanation: 'Since @ResponseBody is present, RequestResponseBodyMethodProcessor handles the return value. It selects MappingJackson2HttpMessageConverter (negotiating Content-Type application/json), calls ObjectMapper.writeValue(), flushes response output stream, and sets mavContainer.setRequestHandled(true) so no ViewResolver runs.',
    executionOrder: 17,
    methods: [
      { name: 'handleReturnValue', signature: 'void handleReturnValue(Object returnValue, MethodParameter returnType, ModelAndViewContainer mavContainer, NativeWebRequest webRequest)', description: 'Serializes object and marks request as handled.' },
      { name: 'writeWithMessageConverters', signature: 'protected void writeWithMessageConverters(T value, MethodParameter returnType, ServletServerHttpRequest inputMessage, ServletServerHttpResponse outputMessage)', description: 'Selects Jackson converter based on Accept header.' }
    ],
    codeSnippet: `// MappingJackson2HttpMessageConverter
protected void writeInternal(Object object, @Nullable Type type, HttpOutputMessage outputMessage) {
    OutputStream outputStream = outputMessage.getBody();
    this.objectMapper.writeValue(outputStream, object);
}`,
    pitfalls: [
      'Infinite recursion / circular references in JPA bidirectional relationships (@OneToMany / @ManyToOne) serialize into infinite JSON loops. Use @JsonIgnore or DTOs.',
      'Serializing Java 8 Instant/LocalDateTime requires com.fasterxml.jackson.datatype:jackson-datatype-jsr310.'
    ],
    interviewQuestions: [
      {
        question: 'How does Spring MVC know whether to render a HTML JSP/Thymeleaf view or return JSON?',
        answer: 'If the method or class is annotated with @ResponseBody (or @RestController), RequestResponseBodyMethodProcessor handles it directly via HttpMessageConverter and skips ViewResolver resolution entirely.'
      }
    ],
    configLevers: [
      'spring.jackson.date-format=yyyy-MM-dd HH:mm:ss',
      'spring.jackson.default-property-inclusion=non_null'
    ],
    x: 1930,
    y: 280,
    width: 290,
    height: 140,
    tags: ['Jackson', 'JSON', 'Serialization', 'ResponseBody'],
    viewModes: ['WEB_REQUEST_PIPELINE']
  },

  // =========================================================================
  // VIEW 2: IOC CONTAINER & BEAN LIFECYCLE (3-LEVEL CACHE)
  // =========================================================================
  {
    id: 'bean_factory_core',
    name: 'DefaultListableBeanFactory',
    simpleName: 'DefaultListableBeanFactory',
    package: 'org.springframework.beans.factory.support.DefaultListableBeanFactory',
    category: 'IOC_CORE',
    layer: 'IoC Container Core',
    roleSummary: 'The heart and engine of Spring IoC container. Holds all BeanDefinitions and singleton cache maps.',
    lowLevelExplanation: 'Implements ConfigurableListableBeanFactory and BeanDefinitionRegistry. Maintains beanDefinitionMap (ConcurrentHashMap<String, BeanDefinition>), beanDefinitionNames, and the famous three-level singleton cache for circular dependency resolution.',
    executionOrder: 1,
    methods: [
      { name: 'registerBeanDefinition', signature: 'void registerBeanDefinition(String beanName, BeanDefinition beanDefinition)', description: 'Stores BeanDefinition metadata in internal concurrent map.' },
      { name: 'getBean', signature: 'Object getBean(String name)', description: 'Entrypoint for retrieving or instantiating a bean.' },
      { name: 'doGetBean', signature: 'protected <T> T doGetBean(String name, Class<T> requiredType, Object[] args, boolean typeCheckOnly)', description: 'Core bean retrieval logic with 3-level cache inspection.' }
    ],
    codeSnippet: `// DefaultListableBeanFactory fields:
private final Map<String, BeanDefinition> beanDefinitionMap = new ConcurrentHashMap<>(256);
private final List<String> beanDefinitionNames = new ArrayList<>(256);
// Singleton caches inherited from DefaultSingletonBeanRegistry:
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256); // 1st level
private final Map<String, Object> earlySingletonObjects = new HashMap<>(16);       // 2nd level
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16); // 3rd level`,
    pitfalls: [
      'Creating prototype beans in high-throughput loops can cause OutOfMemoryError because Spring does not manage destruction of prototypes.',
      'Circular dependency injection via CONSTRUCTORS cannot be resolved by the 3-level cache (throws BeanCurrentlyInCreationException).'
    ],
    interviewQuestions: [
      {
        question: 'What is the relationship between BeanFactory and ApplicationContext?',
        answer: 'BeanFactory is the root interface providing basic IoC/DI functionality. ApplicationContext extends BeanFactory and adds enterprise services (AOP integration, MessageSource i18n, Event publishing, ResourceLoader, WebApplicationContext environment).'
      }
    ],
    configLevers: [
      'spring.main.allow-circular-references=false (Spring Boot 2.6+ default is FALSE)'
    ],
    x: 40,
    y: 100,
    width: 290,
    height: 150,
    tags: ['IoC', 'BeanFactory', 'DefaultListableBeanFactory', 'Core'],
    viewModes: ['IOC_BEAN_LIFECYCLE']
  },
  {
    id: 'bean_def_registry',
    name: 'BeanDefinition & Scanner',
    simpleName: 'BeanDefinition Registry',
    package: 'org.springframework.beans.factory.config.BeanDefinition',
    category: 'IOC_CORE',
    layer: 'IoC Container Core',
    roleSummary: 'Holds class metadata, scope, lazy-init status, constructor args, and autowiring mode before instantiation.',
    lowLevelExplanation: 'ClassPathBeanDefinitionScanner scans classpath bytecode using ASM (SimpleMetadataReader). Generates AnnotatedGenericBeanDefinition or ScannedGenericBeanDefinition representing @Component, @Service, @Repository.',
    executionOrder: 2,
    methods: [
      { name: 'scan', signature: 'int scan(String... basePackages)', description: 'Scans packages for candidate components.' },
      { name: 'isCandidateComponent', signature: 'boolean isCandidateComponent(MetadataReader metadataReader)', description: 'Checks if class matches include filters (@Component).' }
    ],
    codeSnippet: `BeanDefinition bd = new ScannedGenericBeanDefinition(metadataReader);
bd.setScope(BeanDefinition.SCOPE_SINGLETON);
bd.setLazyInit(false);
registry.registerBeanDefinition("orderService", bd);`,
    pitfalls: [
      'Classpath scanning hundreds of packages without explicit filters slows down application cold startup time significantly.'
    ],
    interviewQuestions: [
      {
        question: 'Does Spring load all classes into JVM during component scanning?',
        answer: 'No! Spring uses ASM (ClassReader) to parse .class file bytecode directly without loading the classes into JVM memory, saving metaspace and avoiding classloader side-effects.'
      }
    ],
    configLevers: [
      '@ComponentScan(basePackages = "com.example")',
      'spring.context.lazy-initialization=true'
    ],
    x: 370,
    y: 100,
    width: 270,
    height: 140,
    tags: ['BeanDefinition', 'ASM', 'ComponentScan'],
    viewModes: ['IOC_BEAN_LIFECYCLE']
  },
  {
    id: 'bfpp_config',
    name: 'ConfigurationClassPostProcessor (BFPP)',
    simpleName: 'ConfigurationClassPostProcessor',
    package: 'org.springframework.context.annotation.ConfigurationClassPostProcessor',
    category: 'IOC_CORE',
    layer: 'BeanFactoryPostProcessor Phase',
    roleSummary: 'The most critical BeanFactoryPostProcessor. Parses @Configuration, @Bean, @Import, and @PropertySource.',
    lowLevelExplanation: 'Executes during postProcessBeanFactory(). Enhances full @Configuration classes using CGLIB so that inter-bean method calls (e.g. dataSource() called from transactionManager()) return the cached singleton bean rather than invoking the method again.',
    executionOrder: 3,
    methods: [
      { name: 'postProcessBeanDefinitionRegistry', signature: 'void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry)', description: 'Parses @Configuration classes and registers @Bean definitions.' },
      { name: 'enhanceConfigurationClasses', signature: 'void enhanceConfigurationClasses(ConfigurableListableBeanFactory beanFactory)', description: 'Uses CGLIB to proxy @Configuration classes for singleton semantics.' }
    ],
    codeSnippet: `// ConfigurationClassEnhancer: CGLIB callback interceptor
public Object intercept(Object o, Method m, Object[] args, MethodProxy mp) {
    if (isCurrentlyInvokedFactoryMethod(m)) {
        return mp.invokeSuper(o, args);
    }
    return resolveBeanReference(m, beanFactory);
}`,
    pitfalls: [
      'Omitting @Configuration (or setting proxyBeanMethods = false) turns @Bean methods into "Lite mode", meaning direct calls to @Bean methods create NEW unmanaged instances instead of reusing singletons!'
    ],
    interviewQuestions: [
      {
        question: 'Why does Spring CGLIB-enhance @Configuration classes?',
        answer: 'To guarantee singleton scope semantics when one @Bean method calls another @Bean method within the same configuration class.'
      }
    ],
    configLevers: [
      '@Configuration(proxyBeanMethods = false) // Spring Boot 2.2+ optimization'
    ],
    x: 680,
    y: 100,
    width: 290,
    height: 140,
    tags: ['BFPP', 'CGLIB', 'Configuration', 'Bean'],
    viewModes: ['IOC_BEAN_LIFECYCLE']
  },
  {
    id: 'three_level_cache',
    name: 'Three-Level Singleton Cache (Circular Dependency Engine)',
    simpleName: '3-Level Cache System',
    package: 'org.springframework.beans.factory.support.DefaultSingletonBeanRegistry',
    category: 'IOC_CORE',
    layer: 'Instantiation & Cache Resolution',
    roleSummary: 'Solves circular dependencies (e.g. BeanA needs BeanB, BeanB needs BeanA) for singleton setter/field injection.',
    lowLevelExplanation: 'Level 1: singletonObjects (fully initialized). Level 2: earlySingletonObjects (instantiated, not yet initialized, early proxy). Level 3: singletonFactories (stores ObjectFactory with SmartInstantiationAwareBeanPostProcessor to create early proxy only if circular dependency exists).',
    executionOrder: 4,
    methods: [
      { name: 'getSingleton', signature: 'protected Object getSingleton(String beanName, boolean allowEarlyReference)', description: 'Checks Level 1 -> Level 2 -> Level 3 in strict order.' },
      { name: 'addSingletonFactory', signature: 'protected void addSingletonFactory(String beanName, ObjectFactory<?> singletonFactory)', description: 'Puts early factory in Level 3 before property injection.' },
      { name: 'addSingleton', signature: 'protected void addSingleton(String beanName, Object singletonObject)', description: 'Promotes to Level 1, clears Level 2 and Level 3.' }
    ],
    codeSnippet: `// DefaultSingletonBeanRegistry.java
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    Object singletonObject = this.singletonObjects.get(beanName); // 1st Level
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        synchronized (this.singletonObjects) {
            singletonObject = this.earlySingletonObjects.get(beanName); // 2nd Level
            if (singletonObject == null && allowEarlyReference) {
                ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName); // 3rd Level
                if (singletonFactory != null) {
                    singletonObject = singletonFactory.getObject();
                    this.earlySingletonObjects.put(beanName, singletonObject);
                    this.singletonFactories.remove(beanName);
                }
            }
        }
    }
    return singletonObject;
}`,
    pitfalls: [
      'Spring Boot 2.6+ disables circular references by default (throws BeanCurrentlyInCreationException) to encourage clean architectural design.',
      'Circular dependency with @Async or Constructor injection CANNOT be resolved by 3-level cache.'
    ],
    interviewQuestions: [
      {
        question: 'Why does Spring need a 3rd level cache (singletonFactories) instead of just 2 caches?',
        answer: 'For AOP Proxies! Spring follows the rule that beans should only be proxied AFTER full initialization (in BeanPostProcessor.afterInitialization). Level 3 ensures that an early proxy is generated ONLY IF a circular dependency actually occurs, preserving standard lifecycle otherwise.'
      }
    ],
    configLevers: [
      'spring.main.allow-circular-references=true',
      '@Lazy on constructor parameter'
    ],
    x: 1010,
    y: 100,
    width: 320,
    height: 160,
    tags: ['3LevelCache', 'CircularDependency', 'singletonObjects', 'AOP'],
    viewModes: ['IOC_BEAN_LIFECYCLE']
  },
  {
    id: 'populate_bean',
    name: 'populateBean (Property & Dependency Injection)',
    simpleName: 'populateBean & Autowiring',
    package: 'org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory',
    category: 'IOC_CORE',
    layer: 'Dependency Injection Phase',
    roleSummary: 'Injects dependencies via AutowiredAnnotationBeanPostProcessor and setter reflection.',
    lowLevelExplanation: 'Executes postProcessProperties() on InstantiationAwareBeanPostProcessor instances. Injects @Autowired fields and methods using Java reflection (field.setAccessible(true); field.set(bean, dependency)).',
    executionOrder: 5,
    methods: [
      { name: 'populateBean', signature: 'protected void populateBean(String beanName, RootBeanDefinition mbd, BeanWrapper bw)', description: 'Injects dependencies into bean wrapper instance.' },
      { name: 'postProcessProperties', signature: 'PropertyValues postProcessProperties(PropertyValues pvs, Object bean, String beanName)', description: 'AutowiredAnnotationBeanPostProcessor resolves @Autowired dependencies.' }
    ],
    codeSnippet: `// AutowiredAnnotationBeanPostProcessor.AutowiredFieldElement
protected void inject(Object bean, @Nullable String beanName, @Nullable PropertyValues pvs) {
    Field field = this.field;
    Object value = beanFactory.resolveDependency(desc, beanName, autowiredBeanNames, typeConverter);
    field.setAccessible(true);
    field.set(bean, value);
}`,
    pitfalls: [
      'Field injection prevents making dependencies final and impairs unit testing without SpringRunner. Prefer Constructor Injection.'
    ],
    interviewQuestions: [
      {
        question: 'How does @Autowired choose between multiple candidate beans of the same type?',
        answer: '1. Checks @Primary. 2. Checks @Priority. 3. Falls back to matching the parameter/field variable name with the bean name. 4. If still ambiguous, throws NoUniqueBeanDefinitionException (unless @Qualifier is specified).'
      }
    ],
    configLevers: [
      '@Qualifier("specificBeanName")',
      '@Primary'
    ],
    x: 1370,
    y: 100,
    width: 290,
    height: 140,
    tags: ['DI', 'Autowired', 'Reflection', 'populateBean'],
    viewModes: ['IOC_BEAN_LIFECYCLE']
  },
  {
    id: 'bean_post_processor_lifecycle',
    name: 'BeanPostProcessor Lifecycle (@PostConstruct & Proxying)',
    simpleName: 'BeanPostProcessor Execution',
    package: 'org.springframework.beans.factory.config.BeanPostProcessor',
    category: 'BEAN_POST_PROCESSOR',
    layer: 'Initialization & Proxying Phase',
    roleSummary: 'Executes before/after initialization hooks, @PostConstruct, InitializingBean, and wraps beans in AOP proxies.',
    lowLevelExplanation: '1. applyBeanPostProcessorsBeforeInitialization (runs InitDestroyAnnotationBeanPostProcessor for @PostConstruct). 2. invokeInitMethods (runs InitializingBean.afterPropertiesSet and custom initMethod). 3. applyBeanPostProcessorsAfterInitialization (runs AnnotationAwareAspectJAutoProxyCreator to create CGLIB / JDK Dynamic Proxy).',
    executionOrder: 6,
    methods: [
      { name: 'postProcessBeforeInitialization', signature: 'Object postProcessBeforeInitialization(Object bean, String beanName)', description: 'Invokes @PostConstruct methods.' },
      { name: 'afterPropertiesSet', signature: 'void afterPropertiesSet() throws Exception', description: 'InitializingBean interface callback.' },
      { name: 'postProcessAfterInitialization', signature: 'Object postProcessAfterInitialization(Object bean, String beanName)', description: 'Wraps bean in CGLIB or JDK dynamic proxy.' }
    ],
    codeSnippet: `// AbstractAutowireCapableBeanFactory.initializeBean()
Object wrappedBean = bean;
wrappedBean = applyBeanPostProcessorsBeforeInitialization(wrappedBean, beanName); // @PostConstruct
invokeInitMethods(beanName, wrappedBean, mbd); // InitializingBean.afterPropertiesSet()
wrappedBean = applyBeanPostProcessorsAfterInitialization(wrappedBean, beanName); // AOP Proxy creation!
return wrappedBean;`,
    pitfalls: [
      'Calling methods annotated with @Transactional or @Async from inside @PostConstruct will FAIL to run in a transactional context because the proxy is created AFTER initialization.'
    ],
    interviewQuestions: [
      {
        question: 'What is the exact execution order among @PostConstruct, InitializingBean, and custom initMethod?',
        answer: '1. @PostConstruct (via CommonAnnotationBeanPostProcessor) -> 2. InitializingBean.afterPropertiesSet() -> 3. custom init-method defined in @Bean(initMethod = "...").'
      }
    ],
    configLevers: [
      '@PostConstruct',
      'InitializingBean',
      '@Bean(initMethod = "init", destroyMethod = "cleanup")'
    ],
    x: 1700,
    y: 100,
    width: 320,
    height: 160,
    tags: ['BPP', 'PostConstruct', 'AOPProxy', 'InitializingBean'],
    viewModes: ['IOC_BEAN_LIFECYCLE', 'TRANSACTIONS_AND_DATA']
  },

  // =========================================================================
  // VIEW 3: SPRING BOOT STARTUP & BOOTSTRAP SEQUENCE
  // =========================================================================
  {
    id: 'spring_application_run',
    name: 'SpringApplication.run(Application.class, args)',
    simpleName: 'SpringApplication.run()',
    package: 'org.springframework.boot.SpringApplication',
    category: 'BOOTSTRAP',
    layer: 'Bootstrap & Environment Phase',
    roleSummary: 'Entrypoint of any Spring Boot application, orchestrating the entire bootstrap sequence.',
    lowLevelExplanation: '1. Determines WebApplicationType (SERVLET, REACTIVE, NONE). 2. Loads BootstrapRegistryInitializers. 3. Instantiates ApplicationContext. 4. Prepares Environment. 5. Prints Banner. 6. Calls refreshContext(). 7. Invokes ApplicationRunner and CommandLineRunner beans.',
    executionOrder: 1,
    methods: [
      { name: 'run', signature: 'public ConfigurableApplicationContext run(String... args)', description: 'Main orchestration loop of Spring Boot bootstrap.' },
      { name: 'createApplicationContext', signature: 'protected ConfigurableApplicationContext createApplicationContext()', description: 'Creates AnnotationConfigServletWebServerApplicationContext for Servlet apps.' }
    ],
    codeSnippet: `@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}`,
    pitfalls: [
      'Executing long-running blocking code in main() before or during run() halts startup before health endpoints become available.'
    ],
    interviewQuestions: [
      {
        question: 'How does Spring Boot deduce WebApplicationType at startup?',
        answer: 'By checking classpath indicators: If org.springframework.web.reactive.DispatcherHandler is present and Tomcat is absent -> REACTIVE. If javax/jakarta.servlet.Servlet and ConfigurableWebApplicationContext are present -> SERVLET. Otherwise -> NONE.'
      }
    ],
    configLevers: [
      'SpringApplication app = new SpringApplication(App.class); app.setWebApplicationType(WebApplicationType.SERVLET);'
    ],
    x: 40,
    y: 120,
    width: 290,
    height: 140,
    tags: ['Bootstrap', 'SpringApplication', 'Startup'],
    viewModes: ['STARTUP_BOOTSTRAP']
  },
  {
    id: 'environment_preparation',
    name: 'Environment Preparation & ConfigData',
    simpleName: 'Environment & ConfigData',
    package: 'org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor',
    category: 'BOOTSTRAP',
    layer: 'Bootstrap & Environment Phase',
    roleSummary: 'Builds StandardServletEnvironment, resolves active profiles, loads application.yaml.',
    lowLevelExplanation: 'Queries ConfigDataLoaders to parse application.properties / application.yaml, resolves profiles (spring.profiles.active), binds OS environment variables, system properties, and command-line arguments into a PropertySources hierarchy with strict precedence.',
    executionOrder: 2,
    methods: [
      { name: 'prepareEnvironment', signature: 'private ConfigurableEnvironment prepareEnvironment(...)', description: 'Creates and binds environment property sources.' }
    ],
    codeSnippet: `// Property Source Precedence (Highest to Lowest):
1. Command line arguments (--server.port=9090)
2. SPRING_APPLICATION_JSON inline JSON
3. OS Environment variables (SERVER_PORT=9090)
4. Config data: application-{profile}.yaml
5. Config data: application.yaml inside JAR`,
    pitfalls: [
      'Hyphenated vs camelCase properties in environment variables: Linux shells do not allow dots or dashes; use relaxed binding (e.g. SPRING_DATASOURCE_URL for spring.datasource.url).'
    ],
    interviewQuestions: [
      {
        question: 'What is the order of precedence between application.properties and OS environment variables?',
        answer: 'OS Environment variables have HIGHER precedence than packaged application.properties/yaml files, allowing container runtime overrides.'
      }
    ],
    configLevers: [
      '--spring.profiles.active=prod',
      'SPRING_CONFIG_IMPORT=vault://...'
    ],
    x: 370,
    y: 120,
    width: 280,
    height: 140,
    tags: ['Environment', 'YAML', 'ConfigData', 'Profiles'],
    viewModes: ['STARTUP_BOOTSTRAP']
  },
  {
    id: 'autoconfiguration_engine',
    name: 'AutoConfigurationImportSelector & Conditions',
    simpleName: 'Auto-Configuration Engine',
    package: 'org.springframework.boot.autoconfigure.AutoConfigurationImportSelector',
    category: 'AUTOCONFIG',
    layer: 'Auto-Configuration Phase',
    roleSummary: 'Discovers and selectively activates starter configurations using @Conditional annotations.',
    lowLevelExplanation: 'Reads META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports. Uses ConditionEvaluator to test @ConditionalOnClass, @ConditionalOnMissingBean, @ConditionalOnProperty. Only passing auto-configurations are registered into the BeanDefinitionRegistry.',
    executionOrder: 3,
    methods: [
      { name: 'selectImports', signature: 'String[] selectImports(AnnotationMetadata annotationMetadata)', description: 'Returns filtered list of candidate auto-configuration class names.' },
      { name: 'getAutoConfigurationEntry', signature: 'protected AutoConfigurationEntry getAutoConfigurationEntry(...)', description: 'Applies exclusion and condition filtering.' }
    ],
    codeSnippet: `@AutoConfiguration
@ConditionalOnClass(DataSource.class)
@ConditionalOnMissingBean(DataSource.class)
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {
    @Bean
    public HikariDataSource dataSource() { ... }
}`,
    pitfalls: [
      'Creating a custom @Bean with the same type and name disables the auto-configured bean due to @ConditionalOnMissingBean, which can silently deactivate built-in starters if not intentional.'
    ],
    interviewQuestions: [
      {
        question: 'Where does Spring Boot 3+ read auto-configuration class names from?',
        answer: 'From META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports (in Spring Boot 2.x it was spring.factories under EnableAutoConfiguration key).'
      }
    ],
    configLevers: [
      '@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})',
      'spring.autoconfigure.exclude=...'
    ],
    x: 690,
    y: 120,
    width: 320,
    height: 150,
    tags: ['AutoConfiguration', 'Conditional', 'Starters', 'Imports'],
    viewModes: ['STARTUP_BOOTSTRAP']
  },
  {
    id: 'context_refresh_12_phases',
    name: 'AbstractApplicationContext.refresh() [12 Phases]',
    simpleName: 'ApplicationContext.refresh()',
    package: 'org.springframework.context.support.AbstractApplicationContext',
    category: 'BOOTSTRAP',
    layer: 'ApplicationContext Refresh Phase',
    roleSummary: 'The grand lifecycle sequence of Spring Framework: executes the 12 canonical startup phases.',
    lowLevelExplanation: '1. prepareRefresh -> 2. obtainFreshBeanFactory -> 3. prepareBeanFactory -> 4. postProcessBeanFactory -> 5. invokeBeanFactoryPostProcessors -> 6. registerBeanPostProcessors -> 7. initMessageSource -> 8. initApplicationEventMulticaster -> 9. onRefresh (Boots Tomcat!) -> 10. registerListeners -> 11. finishBeanFactoryInitialization (instantiates singletons) -> 12. finishRefresh.',
    executionOrder: 4,
    methods: [
      { name: 'refresh', signature: 'public void refresh() throws BeansException, IllegalStateException', description: 'Synchronized core execution of all 12 container initialization phases.' },
      { name: 'onRefresh', signature: 'protected void onRefresh()', description: 'Template method overridden by ServletWebServerApplicationContext to start Tomcat.' }
    ],
    codeSnippet: `// AbstractApplicationContext.java
public void refresh() {
    synchronized (this.startupShutdownMonitor) {
        prepareRefresh();
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();
        invokeBeanFactoryPostProcessors(beanFactory);
        registerBeanPostProcessors(beanFactory);
        onRefresh(); // ServletWebServerApplicationContext starts Tomcat here!
        finishBeanFactoryInitialization(beanFactory); // Creates all @Component & @Service singletons!
        finishRefresh();
    }
}`,
    pitfalls: [
      'Exceptions during refresh() trigger destroyBeans() and close(), resulting in complete context tear-down.'
    ],
    interviewQuestions: [
      {
        question: 'In which refresh() phase does Spring Boot start the embedded Tomcat Web Server?',
        answer: 'In the onRefresh() phase, implemented by ServletWebServerApplicationContext. It creates the Tomcat instance and binds to the server port before non-lazy singletons are initialized.'
      }
    ],
    configLevers: [
      'ApplicationContextInitializer<C>',
      'SpringApplication.addInitializers(...)'
    ],
    x: 1050,
    y: 120,
    width: 330,
    height: 160,
    tags: ['refresh', 'ApplicationContext', 'Lifecycle', '12Phases'],
    viewModes: ['STARTUP_BOOTSTRAP', 'IOC_BEAN_LIFECYCLE']
  },

  // =========================================================================
  // VIEW 4: TRANSACTIONS & DATA PERSISTENCE
  // =========================================================================
  {
    id: 'tx_interceptor',
    name: 'TransactionInterceptor (@Transactional AOP)',
    simpleName: 'TransactionInterceptor',
    package: 'org.springframework.transaction.interceptor.TransactionInterceptor',
    category: 'PROXY_AOP',
    layer: 'Transaction & Persistence Pipeline',
    roleSummary: 'AOP MethodInterceptor intercepting @Transactional methods to begin, commit, or rollback transactions.',
    lowLevelExplanation: 'Extends TransactionAspectSupport. Intercepts method call. Calls createTransactionIfNecessary(), invokes target method. If invocation throws a RuntimeException / Error (or configured rollbackFor), triggers completeTransactionAfterThrowing(). Otherwise calls commitTransactionAfterReturning().',
    executionOrder: 1,
    methods: [
      { name: 'invoke', signature: 'Object invoke(MethodInvocation invocation) throws Throwable', description: 'Wraps target method execution in declarative transaction boundary.' }
    ],
    codeSnippet: `// TransactionAspectSupport.invokeWithinTransaction()
TransactionInfo txInfo = createTransactionIfNecessary(tm, txAttr, joinpointIdentification);
Object retVal;
try {
    retVal = invocation.proceedWithInvocation();
} catch (Throwable ex) {
    completeTransactionAfterThrowing(txInfo, ex);
    throw ex;
} finally {
    cleanupTransactionInfo(txInfo);
}
commitTransactionAfterReturning(txInfo);
return retVal;`,
    pitfalls: [
      'Self-invocation pitfall: Calling this.updateOrder() from within the same class bypasses the CGLIB proxy, so @Transactional is completely ignored!',
      '@Transactional on private methods is silently ignored by Spring AOP CGLIB/JDK dynamic proxies.'
    ],
    interviewQuestions: [
      {
        question: 'Why does @Transactional rollback only on RuntimeException and Error by default, not checked Exceptions?',
        answer: 'Spring follows the EJB tradition: checked exceptions represent expected business failure conditions (recoverable), whereas unchecked exceptions represent unexpected system errors. You can override this using @Transactional(rollbackFor = Exception.class).'
      }
    ],
    configLevers: [
      '@Transactional(propagation = Propagation.REQUIRED, isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)',
      '@EnableTransactionManagement(proxyTargetClass = true)'
    ],
    x: 40,
    y: 120,
    width: 300,
    height: 150,
    tags: ['Transactional', 'AOP', 'Rollback', 'Proxy'],
    viewModes: ['TRANSACTIONS_AND_DATA']
  },
  {
    id: 'tx_sync_manager',
    name: 'TransactionSynchronizationManager',
    simpleName: 'TxSynchronizationManager',
    package: 'org.springframework.transaction.support.TransactionSynchronizationManager',
    category: 'PROXY_AOP',
    layer: 'Transaction & Persistence Pipeline',
    roleSummary: 'ThreadLocal manager storing active database Connection and Hibernate Session for the current thread.',
    lowLevelExplanation: 'Maintains ThreadLocal<Map<Object, Object>> resources (mapping DataSource to ConnectionHolder). When repositories or EntityManager need a database connection, they query this class to reuse the thread-bound connection instead of pulling a new one from HikariCP.',
    executionOrder: 2,
    methods: [
      { name: 'bindResource', signature: 'public static void bindResource(Object key, Object value)', description: 'Binds DataSource -> ConnectionHolder to ThreadLocal.' },
      { name: 'getResource', signature: 'public static Object getResource(Object key)', description: 'Retrieves active connection for the current thread.' }
    ],
    codeSnippet: `// TransactionSynchronizationManager.java
private static final ThreadLocal<Map<Object, Object>> resources =
    new NamedThreadLocal<>("Transactional resources");
private static final ThreadLocal<Set<TransactionSynchronization>> synchronizations =
    new NamedThreadLocal<>("Transaction synchronizations");`,
    pitfalls: [
      'Spawning async threads (e.g. CompletableFuture.supplyAsync) inside a @Transactional method loses the ThreadLocal connection and runs in a separate non-transactional context.'
    ],
    interviewQuestions: [
      {
        question: 'How does Spring ensure that multiple DAO/Repository calls in the same service method share the exact same DB connection?',
        answer: 'Via TransactionSynchronizationManager. The PlatformTransactionManager binds the ConnectionHolder to ThreadLocal resources at transaction start; subsequent DAO calls query getResource(dataSource) to reuse it.'
      }
    ],
    configLevers: [
      'TransactionSynchronizationManager.isActualTransactionActive()',
      'TransactionSynchronizationManager.registerSynchronization(...)'
    ],
    x: 380,
    y: 120,
    width: 320,
    height: 150,
    tags: ['ThreadLocal', 'ConnectionHolder', 'Synchronization'],
    viewModes: ['TRANSACTIONS_AND_DATA']
  },
  {
    id: 'hikari_connection_pool',
    name: 'HikariCP Connection Pool',
    simpleName: 'HikariCP Pool',
    package: 'com.zaxxer.hikari.HikariDataSource',
    category: 'DATA_PERSISTENCE',
    layer: 'Transaction & Persistence Pipeline',
    roleSummary: 'High-performance JDBC connection pool delivering ultra-fast lock-free connection checkout.',
    lowLevelExplanation: 'Uses FastList (eliminates array bounds check) and ConcurrentBag (lock-free thread-local handoff queue). getConnection() checks ThreadLocal cache first, avoiding lock contention between worker threads.',
    executionOrder: 3,
    methods: [
      { name: 'getConnection', signature: 'public Connection getConnection() throws SQLException', description: 'Checks out active JDBC connection from pool.' }
    ],
    codeSnippet: `// HikariCP ConcurrentBag borrowing:
final List<Object> list = threadList.get();
for (int i = list.size() - 1; i >= 0; i--) {
    final Object entry = list.remove(i);
    final T bagEntry = weakThreadLocals ? ((WeakReference<T>) entry).get() : (T) entry;
    if (bagEntry != null && bagEntry.compareAndSet(STATE_NOT_IN_USE, STATE_IN_USE)) {
        return bagEntry;
    }
}`,
    pitfalls: [
      'Connection leak: long-running external HTTP API calls inside a @Transactional method keep the checked-out JDBC connection idle, starving the Hikari pool.'
    ],
    interviewQuestions: [
      {
        question: 'What makes HikariCP faster than older pools like Commons DBCP or C3P0?',
        answer: 'Bytecode optimizations (invokevirtual vs invokeinterface), FastList (zero range check overhead), and ConcurrentBag lock-free thread-local queue.'
      }
    ],
    configLevers: [
      'spring.datasource.hikari.maximum-pool-size=10',
      'spring.datasource.hikari.connection-timeout=30000',
      'spring.datasource.hikari.leak-detection-threshold=2000'
    ],
    x: 740,
    y: 120,
    width: 290,
    height: 150,
    tags: ['HikariCP', 'JDBC', 'ConnectionPool', 'Concurrency'],
    viewModes: ['TRANSACTIONS_AND_DATA']
  },
  {
    id: 'hibernate_session_osiv',
    name: 'Hibernate Session & 1st Level Cache',
    simpleName: 'Hibernate Session & OSIV',
    package: 'org.hibernate.internal.SessionImpl',
    category: 'DATA_PERSISTENCE',
    layer: 'Transaction & Persistence Pipeline',
    roleSummary: 'Persistence context managing Entity lifecycle (Transient, Managed, Detached, Removed) and dirty checking.',
    lowLevelExplanation: 'Maintains an IdentityMap (1st-level cache) ensuring repeated findById calls return the identical entity reference without SQL queries. At flush() time, compares entity snapshots against current state (Dirty Checking) and emits SQL UPDATE.',
    executionOrder: 4,
    methods: [
      { name: 'flush', signature: 'void flush()', description: 'Executes dirty check and flushes pending SQL statements to JDBC driver.' },
      { name: 'find', signature: '<T> T find(Class<T> entityClass, Object primaryKey)', description: 'Queries 1st-level cache before executing SQL SELECT.' }
    ],
    codeSnippet: `// OpenEntityManagerInViewFilter (OSIV)
// Kept open throughout the entire web request!
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) {
    EntityManager em = createEntityManager();
    TransactionSynchronizationManager.bindResource(emf, new EntityManagerHolder(em));
    try {
        filterChain.doFilter(request, response);
    } finally {
        TransactionSynchronizationManager.unbindResource(emf);
        em.close();
    }
}`,
    pitfalls: [
      'spring.jpa.open-in-view=true (OSIV) is enabled by default: holding database connections open until JSON serialization completes can exhaust database connection pools rapidly under traffic spikes.'
    ],
    interviewQuestions: [
      {
        question: 'What is the N+1 select problem in JPA and how do you resolve it?',
        answer: 'Fetching a parent collection where each child triggers a separate SQL query. Resolved via @EntityGraph, JOIN FETCH in JPQL, or Hibernate batch fetching (spring.jpa.properties.hibernate.default_batch_fetch_size=20).'
      }
    ],
    configLevers: [
      'spring.jpa.open-in-view=false (recommended for high throughput microservices)',
      'spring.jpa.properties.hibernate.default_batch_fetch_size=25'
    ],
    x: 1070,
    y: 120,
    width: 320,
    height: 160,
    tags: ['Hibernate', 'JPA', 'OSIV', 'DirtyChecking', '1stLevelCache'],
    viewModes: ['TRANSACTIONS_AND_DATA']
  }
];

export const GRAPH_EDGES: GraphEdge[] = [
  // Web Request Pipeline Edges
  { id: 'e1', from: 'client_request', to: 'tomcat_nio_connector', label: 'TCP / HTTP Request', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e2', from: 'tomcat_nio_connector', to: 'application_filter_chain', label: 'StandardContext.invoke()', lowLevelCall: 'filters[pos++].doFilter()', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e3', from: 'application_filter_chain', to: 'character_encoding_filter', label: 'doFilter()', lowLevelCall: 'pos=0', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e4', from: 'character_encoding_filter', to: 'delegating_filter_proxy', label: 'chain.doFilter()', lowLevelCall: 'pos=1', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e5', from: 'delegating_filter_proxy', to: 'filter_chain_proxy', label: 'delegate.doFilter()', lowLevelCall: 'wac.getBean("springSecurityFilterChain")', viewModes: ['WEB_REQUEST_PIPELINE', 'SECURITY_FILTER_CHAIN'] },
  { id: 'e6', from: 'filter_chain_proxy', to: 'sec_filter_context', label: 'VirtualFilterChain.doFilter()', viewModes: ['WEB_REQUEST_PIPELINE', 'SECURITY_FILTER_CHAIN'] },
  { id: 'e7', from: 'sec_filter_context', to: 'sec_filter_csrf', label: 'chain.doFilter()', viewModes: ['SECURITY_FILTER_CHAIN'] },
  { id: 'e8', from: 'sec_filter_csrf', to: 'sec_filter_auth', label: 'chain.doFilter()', viewModes: ['SECURITY_FILTER_CHAIN'] },
  { id: 'e9', from: 'sec_filter_auth', to: 'sec_filter_authz', label: 'chain.doFilter()', viewModes: ['SECURITY_FILTER_CHAIN'] },
  { id: 'e10', from: 'filter_chain_proxy', to: 'dispatcher_servlet', label: 'servlet.service(req, res)', lowLevelCall: 'doDispatch(request, response)', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e11', from: 'dispatcher_servlet', to: 'handler_mapping', label: 'getHandler(req)', lowLevelCall: 'lookupHandlerMethod(path)', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e12', from: 'handler_mapping', to: 'handler_interceptor', label: 'applyPreHandle()', lowLevelCall: 'interceptor.preHandle()', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e13', from: 'dispatcher_servlet', to: 'handler_adapter', label: 'getHandlerAdapter()', lowLevelCall: 'ha.handle(req, res, handler)', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e14', from: 'handler_adapter', to: 'argument_resolvers', label: 'resolveArgument()', lowLevelCall: 'supportsParameter() -> resolve()', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e15', from: 'argument_resolvers', to: 'target_controller', label: 'invokeAndHandle()', lowLevelCall: 'method.invoke(controller, args)', viewModes: ['WEB_REQUEST_PIPELINE'] },
  { id: 'e16', from: 'target_controller', to: 'return_value_handler', label: 'handleReturnValue()', lowLevelCall: 'HttpMessageConverter.write()', viewModes: ['WEB_REQUEST_PIPELINE'] },

  // IoC & Bean Lifecycle Edges
  { id: 'ioc_e1', from: 'bean_factory_core', to: 'bean_def_registry', label: 'registerBeanDefinition()', viewModes: ['IOC_BEAN_LIFECYCLE'] },
  { id: 'ioc_e2', from: 'bean_def_registry', to: 'bfpp_config', label: 'postProcessBeanDefinitionRegistry()', viewModes: ['IOC_BEAN_LIFECYCLE'] },
  { id: 'ioc_e3', from: 'bfpp_config', to: 'three_level_cache', label: 'getSingleton() / addSingletonFactory()', lowLevelCall: '3rd Level: singletonFactories', viewModes: ['IOC_BEAN_LIFECYCLE'] },
  { id: 'ioc_e4', from: 'three_level_cache', to: 'populate_bean', label: 'populateBean()', lowLevelCall: 'postProcessProperties()', viewModes: ['IOC_BEAN_LIFECYCLE'] },
  { id: 'ioc_e5', from: 'populate_bean', to: 'bean_post_processor_lifecycle', label: 'initializeBean()', lowLevelCall: '@PostConstruct -> afterPropertiesSet -> AOP Proxy', viewModes: ['IOC_BEAN_LIFECYCLE'] },

  // Bootstrap Sequence Edges
  { id: 'boot_e1', from: 'spring_application_run', to: 'environment_preparation', label: 'prepareEnvironment()', lowLevelCall: 'ConfigDataEnvironmentPostProcessor', viewModes: ['STARTUP_BOOTSTRAP'] },
  { id: 'boot_e2', from: 'environment_preparation', to: 'autoconfiguration_engine', label: 'selectImports()', lowLevelCall: 'AutoConfiguration.imports', viewModes: ['STARTUP_BOOTSTRAP'] },
  { id: 'boot_e3', from: 'autoconfiguration_engine', to: 'context_refresh_12_phases', label: 'refreshContext()', lowLevelCall: 'AbstractApplicationContext.refresh()', viewModes: ['STARTUP_BOOTSTRAP'] },

  // Transactions & Data Edges
  { id: 'tx_e1', from: 'tx_interceptor', to: 'tx_sync_manager', label: 'bindResource()', lowLevelCall: 'ThreadLocal<Map<DataSource, ConnectionHolder>>', viewModes: ['TRANSACTIONS_AND_DATA'] },
  { id: 'tx_e2', from: 'tx_sync_manager', to: 'hikari_connection_pool', label: 'getConnection()', lowLevelCall: 'ConcurrentBag.borrow()', viewModes: ['TRANSACTIONS_AND_DATA'] },
  { id: 'tx_e3', from: 'hikari_connection_pool', to: 'hibernate_session_osiv', label: 'SessionImpl.flush()', lowLevelCall: 'Dirty check -> JDBC statement', viewModes: ['TRANSACTIONS_AND_DATA'] }
];

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'req_dispatch_scenario',
    viewMode: 'WEB_REQUEST_PIPELINE',
    name: 'Incoming HTTP GET /api/orders/42 (Auth + Dispatch + Response)',
    shortTitle: 'Web Request Journey',
    description: 'Traces the exact path of an incoming HTTP request through Tomcat NIO, Servlet Filter Chain, Spring Security, DispatcherServlet, Argument Resolvers, Controller, and Jackson JSON output.',
    steps: [
      {
        stepNumber: 1,
        nodeId: 'client_request',
        title: 'Step 1: Client sends HTTP GET Request',
        description: 'Client opens TCP connection and transmits HTTP GET /api/orders/42 with Bearer JWT token header.',
        simpleAnalogy: 'Like sending a physical mail parcel over the postal network to an office building address.',
        whyItMatters: 'If headers like Content-Type or Authorization are malformed, requests fail before hitting application code.',
        keyTakeaway: 'The OS TCP handshake finishes at the network kernel level before Spring Boot wakes up.',
        methodCalled: 'SocketChannel.write(ByteBuffer.wrap(httpBytes))',
        internalStateChange: 'Socket state: CONNECTED, awaiting OS TCP SYN/ACK handshake.',
        highlightEdges: ['e1']
      },
      {
        stepNumber: 2,
        nodeId: 'tomcat_nio_connector',
        title: 'Step 2: Tomcat NIO Acceptor & Poller',
        description: 'Acceptor thread accepts socket. Handed to Poller Selector. Worker thread executes Http11Processor.service().',
        simpleAnalogy: 'The hotel reception desk greeting incoming guests and assigning luggage staff.',
        whyItMatters: 'Tomcat worker threads are limited (default 200). Blocking operations will exhaust threads and stall your app.',
        keyTakeaway: 'Acceptor picks up socket, Poller checks NIO events, Worker pool runs Http11Processor.',
        caller: 'Tomcat Worker Thread (http-nio-8080-exec-1)',
        methodCalled: 'Http11Processor.service(socketWrapper)',
        internalStateChange: 'Allocates org.apache.coyote.Request, parses HTTP headers.',
        highlightEdges: ['e2']
      },
      {
        stepNumber: 3,
        nodeId: 'application_filter_chain',
        title: 'Step 3: ApplicationFilterChain (Tomcat StandardContext)',
        description: 'Tomcat StandardContext invokes ApplicationFilterChain.doFilter(). Position counter pos begins at 0.',
        simpleAnalogy: 'An airport security baggage scanner line where bags pass through multiple checkpoints in order.',
        whyItMatters: 'Filters run sequentially. If any filter forgets to call chain.doFilter(), the request freezes with an empty response.',
        keyTakeaway: 'Standard Java EE Chain of Responsibility; terminates by calling servlet.service().',
        caller: 'ApplicationFilterChain',
        methodCalled: 'internalDoFilter(request, response)',
        internalStateChange: 'pos = 0; fetches filters[0] (CharacterEncodingFilter).',
        highlightEdges: ['e3']
      },
      {
        stepNumber: 4,
        nodeId: 'character_encoding_filter',
        title: 'Step 4: CharacterEncodingFilter enforces UTF-8',
        description: 'Applies request.setCharacterEncoding("UTF-8") before parameters are read.',
        simpleAnalogy: 'Agreeing on the dictionary language (UTF-8) before reading the message text.',
        whyItMatters: 'Must be ordered first! Once request body is read, encoding is locked by the container and cannot be changed.',
        keyTakeaway: 'Extends OncePerRequestFilter and sets request.setCharacterEncoding("UTF-8").',
        caller: 'ApplicationFilterChain',
        methodCalled: 'doFilterInternal(request, response, chain)',
        internalStateChange: 'request.characterEncoding = "UTF-8"',
        highlightEdges: ['e4']
      },
      {
        stepNumber: 5,
        nodeId: 'delegating_filter_proxy',
        title: 'Step 5: DelegatingFilterProxy delegates to Spring Context',
        description: 'Bridges Tomcat Servlet container to Spring IoC. Looks up bean "springSecurityFilterChain".',
        simpleAnalogy: 'An ambassador bridging two worlds: Tomcat calls it, and it finds the real Spring bean.',
        whyItMatters: 'Tomcat does not know about Spring beans. This bridge connects Tomcat to the Spring IoC context.',
        keyTakeaway: 'Lazily looks up "springSecurityFilterChain" from WebApplicationContext.',
        caller: 'ApplicationFilterChain',
        methodCalled: 'delegate.doFilter(request, response, chain)',
        internalStateChange: 'Resolves FilterChainProxy from WebApplicationContext.',
        highlightEdges: ['e5']
      },
      {
        stepNumber: 6,
        nodeId: 'filter_chain_proxy',
        title: 'Step 6: FilterChainProxy matches SecurityFilterChain',
        description: 'Iterates through SecurityFilterChain list. Matches request against RequestMatcher and builds VirtualFilterChain.',
        simpleAnalogy: 'The security chief examining your badge against security policies.',
        whyItMatters: 'Central router that matches your URL against configured SecurityFilterChain beans.',
        keyTakeaway: 'Constructs VirtualFilterChain and steps through all security filters.',
        caller: 'DelegatingFilterProxy',
        methodCalled: 'VirtualFilterChain.doFilter(request, response)',
        internalStateChange: 'Dispatches through active security filters (Context, Csrf, Auth, Authz).',
        highlightEdges: ['e6']
      },
      {
        stepNumber: 7,
        nodeId: 'dispatcher_servlet',
        title: 'Step 7: DispatcherServlet.doDispatch() Entry',
        description: 'Security filter chain finishes successfully. DispatcherServlet front controller takes control of the request.',
        simpleAnalogy: 'The grand central train station dispatcher guiding every passenger to their specific platform.',
        whyItMatters: 'The Front Controller pattern core: all MVC requests enter doDispatch() to orchestrate handlers.',
        keyTakeaway: 'Singleton and stateless by design. Coordinates mappings, adapters, interceptors, and error handling.',
        caller: 'ApplicationFilterChain',
        methodCalled: 'DispatcherServlet.doDispatch(request, response)',
        internalStateChange: 'checkMultipart(request) verifies standard application/json.',
        highlightEdges: ['e11']
      },
      {
        stepNumber: 8,
        nodeId: 'handler_mapping',
        title: 'Step 8: RequestMappingHandlerMapping URL Lookup',
        description: 'Searches MappingRegistry for path /api/orders/{id}. Returns HandlerExecutionChain containing OrderController.getOrder() and Interceptors.',
        simpleAnalogy: 'The phonebook directory looking up which @RestController method handles /api/orders/{id}.',
        whyItMatters: 'Returns HandlerExecutionChain with both your target controller and any path interceptors.',
        keyTakeaway: 'Parses @RequestMapping annotations on startup and caches matches in MappingRegistry.',
        caller: 'DispatcherServlet.getHandler()',
        methodCalled: 'lookupHandlerMethod("/api/orders/42", request)',
        internalStateChange: 'Found match: OrderController#getOrder(Long).',
        highlightEdges: ['e12']
      },
      {
        stepNumber: 9,
        nodeId: 'handler_interceptor',
        title: 'Step 9: HandlerInterceptor.preHandle()',
        description: 'Executes preHandle() on configured interceptors (e.g. auth audit, metrics, performance timer).',
        simpleAnalogy: 'VIP security guards checking authorization badges right outside the conference room.',
        whyItMatters: 'Ideal for metrics, timing, and custom request auditing before the controller runs.',
        keyTakeaway: 'preHandle() can return false to abort the request before controller reflection starts.',
        caller: 'HandlerExecutionChain.applyPreHandle()',
        methodCalled: 'interceptor.preHandle(request, response, handler)',
        internalStateChange: 'preHandle returned true -> request allowed to proceed.',
        highlightEdges: ['e13']
      },
      {
        stepNumber: 10,
        nodeId: 'handler_adapter',
        title: 'Step 10: RequestMappingHandlerAdapter Invocation',
        description: 'Coordinates reflection invocation, creates ServletInvocableHandlerMethod with argument resolvers.',
        simpleAnalogy: 'The power adapter converting raw socket inputs into exact Java method arguments.',
        whyItMatters: 'Decouples DispatcherServlet from specific method signatures, allowing diverse controller styles.',
        keyTakeaway: 'Orchestrates argument resolvers and return value converters.',
        caller: 'DispatcherServlet',
        methodCalled: 'ha.handle(request, response, handler)',
        internalStateChange: 'Prepares WebDataBinder and MethodParameters.',
        highlightEdges: ['e14']
      },
      {
        stepNumber: 11,
        nodeId: 'argument_resolvers',
        title: 'Step 11: PathVariableMethodArgumentResolver',
        description: 'Extracts URI template variable {id} = "42", converts to Long via TypeConverter.',
        simpleAnalogy: 'The package unboxer extracting variables from URL path, headers, or JSON body.',
        whyItMatters: 'Extracts @PathVariable id, deserializes @RequestBody DTOs, and runs @Valid bean validation.',
        keyTakeaway: 'Composite pattern testing supportsParameter() then resolveArgument().',
        caller: 'HandlerMethodArgumentResolverComposite',
        methodCalled: 'resolveArgument(parameter, mavContainer, webRequest, binderFactory)',
        internalStateChange: 'Resolved method argument: 42L.',
        highlightEdges: ['e15']
      },
      {
        stepNumber: 12,
        nodeId: 'target_controller',
        title: 'Step 12: OrderController.getOrder(42L) Execution',
        description: 'Java reflection executes OrderController.getOrder(42L). Business service executes and returns ResponseEntity<OrderDto>.',
        simpleAnalogy: 'Your business headquarters! The actual Java method you wrote.',
        whyItMatters: 'Controllers should be thin orchestrators delegating business logic to services and repositories.',
        keyTakeaway: 'Invoked via Java reflection: method.invoke(controller, args).',
        caller: 'InvocableHandlerMethod.doInvoke(args)',
        methodCalled: 'OrderController.getOrder(42L)',
        internalStateChange: 'Returns new OrderDto(42, "Order #42", 199.99).',
        highlightEdges: ['e16']
      },
      {
        stepNumber: 13,
        nodeId: 'return_value_handler',
        title: 'Step 13: Jackson JSON Serialization & Output',
        description: 'RequestResponseBodyMethodProcessor invokes MappingJackson2HttpMessageConverter. Serializes OrderDto into JSON bytes.',
        simpleAnalogy: 'The export packaging machine packing Java objects into standardized JSON byte boxes.',
        whyItMatters: 'Because @ResponseBody or @RestController is used, skips ViewResolver and streams directly to response.',
        keyTakeaway: 'MappingJackson2HttpMessageConverter writes directly to HttpServletResponse stream.',
        caller: 'HandlerMethodReturnValueHandlerComposite',
        methodCalled: 'objectMapper.writeValue(response.getOutputStream(), orderDto)',
        internalStateChange: 'HTTP 200 OK headers + JSON body written to response output stream.',
        highlightEdges: []
      },
      {
        stepNumber: 14,
        nodeId: 'dispatcher_servlet',
        title: 'Step 14: triggerAfterCompletion & Clean-Up',
        description: 'DispatcherServlet invokes interceptor.afterCompletion() and releases thread resources back to Tomcat pool.',
        simpleAnalogy: 'Checking out of the hotel room and returning the keycard to the front desk.',
        whyItMatters: 'Guarantees ThreadLocal cleanup (preventing data leaks across requests) and frees worker thread.',
        keyTakeaway: 'interceptor.afterCompletion() is guaranteed to execute even if controller threw an exception.',
        caller: 'DispatcherServlet.processDispatchResult()',
        methodCalled: 'mappedHandler.triggerAfterCompletion(request, response, null)',
        internalStateChange: 'ThreadLocal clean-up finished. Worker thread returns to pool.',
        highlightEdges: []
      }
    ]
  },
  {
    id: 'ioc_circular_dep_scenario',
    viewMode: 'IOC_BEAN_LIFECYCLE',
    name: '3-Level Singleton Cache: Circular Dependency (Bean A <-> Bean B)',
    shortTitle: 'Bean Lifecycle & 3-Level Cache',
    description: 'Demonstrates how Spring IoC resolves circular references between ServiceA and ServiceB using the 3-level cache (singletonObjects, earlySingletonObjects, singletonFactories).',
    steps: [
      {
        stepNumber: 1,
        nodeId: 'bean_factory_core',
        title: 'Step 1: doGetBean("serviceA")',
        description: 'Container attempts to get ServiceA. Cache check: 1st, 2nd, 3rd levels return null.',
        simpleAnalogy: 'Looking in your kitchen for coffee beans; finding the cupboard empty, you begin preparing them.',
        whyItMatters: 'Checks singletonObjects (1st level), earlySingletonObjects (2nd), and singletonFactories (3rd).',
        keyTakeaway: 'Records bean name in singletonsCurrentlyInCreation set to detect recursive dependency cycles.',
        methodCalled: 'DefaultListableBeanFactory.doGetBean("serviceA")',
        internalStateChange: 'Marks serviceA as singletonsCurrentlyInCreation.add("serviceA").',
        highlightEdges: ['ioc_e1']
      },
      {
        stepNumber: 2,
        nodeId: 'three_level_cache',
        title: 'Step 2: Instantiate ServiceA & Expose 3rd Level Factory',
        description: 'ServiceA is instantiated via reflection constructor. Before injecting fields, puts ObjectFactory into singletonFactories (3rd level cache).',
        simpleAnalogy: 'Putting an emergency voucher in the box before you finish cooking.',
        whyItMatters: 'If ServiceB asks for ServiceA before ServiceA is finished, this factory can provide an early reference.',
        keyTakeaway: 'singletonFactories.put("serviceA", () -> getEarlyBeanReference(serviceA)).',
        methodCalled: 'addSingletonFactory("serviceA", () -> getEarlyBeanReference(serviceA))',
        internalStateChange: 'singletonFactories.put("serviceA", ObjectFactory); ServiceA is now partially created.',
        highlightEdges: ['ioc_e4']
      },
      {
        stepNumber: 3,
        nodeId: 'populate_bean',
        title: 'Step 3: populateBean(serviceA) -> needs serviceB',
        description: 'ServiceA has @Autowired ServiceB. Spring calls doGetBean("serviceB").',
        simpleAnalogy: 'You realize you need sugar (ServiceB) before your coffee is ready, so you start making sugar.',
        whyItMatters: 'Triggers beanFactory.resolveDependency("serviceB"), initiating ServiceB lifecycle.',
        keyTakeaway: 'Dependencies are injected during the populateBean() phase.',
        methodCalled: 'beanFactory.resolveDependency("serviceB")',
        internalStateChange: 'ServiceB is not yet created. Starts lifecycle for ServiceB.',
        highlightEdges: ['ioc_e3']
      },
      {
        stepNumber: 4,
        nodeId: 'three_level_cache',
        title: 'Step 4: Instantiate ServiceB & Expose 3rd Level Factory',
        description: 'ServiceB is instantiated via reflection. Puts ObjectFactory into singletonFactories (3rd level). ServiceB now attempts to populate its dependencies (@Autowired ServiceA).',
        simpleAnalogy: 'The sugar recipe says: "mix with coffee!" Now ServiceB asks for ServiceA. Cycle detected!',
        whyItMatters: 'Without the 3-level cache, this would create an infinite recursion crash (StackOverflowError).',
        keyTakeaway: 'Both serviceA and serviceB are now in singletonsCurrentlyInCreation.',
        methodCalled: 'addSingletonFactory("serviceB", () -> getEarlyBeanReference(serviceB))',
        internalStateChange: 'singletonFactories.put("serviceB", factoryB); ServiceB requests serviceA.',
        highlightEdges: ['ioc_e4']
      },
      {
        stepNumber: 5,
        nodeId: 'three_level_cache',
        title: 'Step 5: ServiceB resolves ServiceA from 3rd Level Cache',
        description: 'doGetBean("serviceA"): 1st level null, 2nd level null, 3rd level FOUND! Invokes ObjectFactory.getObject(). Promotes ServiceA to earlySingletonObjects (2nd level).',
        simpleAnalogy: 'Finding the emergency voucher ServiceA left behind! ServiceB takes an early reference.',
        whyItMatters: 'Promotes ServiceA from 3rd level (factory) to 2nd level (earlySingletonObjects) to resolve cycle.',
        keyTakeaway: 'Level 3 factory runs SmartInstantiationAwareBeanPostProcessor to create early AOP proxy if needed.',
        methodCalled: 'getSingleton("serviceA", allowEarlyReference=true)',
        internalStateChange: 'earlySingletonObjects.put("serviceA", earlyRefA); singletonFactories.remove("serviceA").',
        highlightEdges: ['ioc_e4']
      },
      {
        stepNumber: 6,
        nodeId: 'populate_bean',
        title: 'Step 6: ServiceB completes population & initialization',
        description: 'ServiceB successfully receives ServiceA early reference. Finishes initializeBean(serviceB). Promotes to Level 1 (singletonObjects).',
        simpleAnalogy: 'ServiceB is now completely cooked, packaged, and put on the top shelf.',
        whyItMatters: 'ServiceB is 100% initialized and placed in singletonObjects (1st level cache).',
        keyTakeaway: 'Removed from creation set and available for any other bean in the application.',
        methodCalled: 'addSingleton("serviceB", fullyInitializedB)',
        internalStateChange: 'singletonObjects.put("serviceB", fullyInitializedB). ServiceB is completely READY.',
        highlightEdges: ['ioc_e5']
      },
      {
        stepNumber: 7,
        nodeId: 'populate_bean',
        title: 'Step 7: ServiceA receives completed ServiceB',
        description: 'Now that ServiceB is fully created, ServiceA field injection completes.',
        simpleAnalogy: 'ServiceA finally gets its finished sugar and can finish its own preparation.',
        whyItMatters: 'Completes field injection: field.set(serviceA, serviceB).',
        keyTakeaway: 'Field or setter injection finishes.',
        methodCalled: 'field.set(serviceA, serviceB)',
        internalStateChange: 'ServiceA dependency injection is complete.',
        highlightEdges: ['ioc_e5']
      },
      {
        stepNumber: 8,
        nodeId: 'bean_post_processor_lifecycle',
        title: 'Step 8: ServiceA completes initialization & Promoted to Level 1',
        description: 'ServiceA executes @PostConstruct, InitializingBean, and postProcessAfterInitialization. Promoted to Level 1 cache. Circular dependency resolved!',
        simpleAnalogy: 'Both coffee and sugar are now fully prepared and ready for use forever.',
        whyItMatters: 'Promoted to singletonObjects (1st level). Circular dependency successfully resolved!',
        keyTakeaway: 'earlySingletonObjects is cleared; both beans are now immutable singletons.',
        methodCalled: 'addSingleton("serviceA", serviceA)',
        internalStateChange: 'singletonObjects.put("serviceA", serviceA); earlySingletonObjects.remove("serviceA").',
        highlightEdges: []
      }
    ]
  },
  {
    id: 'startup_scenario',
    viewMode: 'STARTUP_BOOTSTRAP',
    name: 'Spring Boot Bootstrap & Auto-Configuration Lifecycle',
    shortTitle: 'Bootstrap & Auto-Config',
    description: 'Traces the 10 essential phases of Spring Boot startup from public static void main() down to WebServer port binding and runner callbacks.',
    steps: [
      {
        stepNumber: 1,
        nodeId: 'spring_application_run',
        title: 'Step 1: SpringApplication.run() starts',
        description: 'Initializes StopWatch. Creates DefaultBootstrapContext. Loads SpringApplicationRunListeners.',
        simpleAnalogy: 'Turning the ignition key in a car engine.',
        whyItMatters: 'Initializes StopWatch, bootstraps listeners, and deduces WebApplicationType.',
        keyTakeaway: 'SpringApplication.run() orchestrates the entire container startup sequence.',
        methodCalled: 'SpringApplication.run(Application.class, args)',
        internalStateChange: 'Broadcasting Event: ApplicationStartingEvent.',
        highlightEdges: ['boot_e1']
      },
      {
        stepNumber: 2,
        nodeId: 'environment_preparation',
        title: 'Step 2: Environment Prepared & Config Loaded',
        description: 'Creates StandardServletEnvironment. ConfigDataEnvironmentPostProcessor loads application.yaml and parses active profiles.',
        simpleAnalogy: 'Reading the car settings and GPS directions before starting the journey.',
        whyItMatters: 'Loads application.yaml, active profiles, and environment variables into PropertySources.',
        keyTakeaway: 'OS Environment variables override packaged YAML properties by design.',
        methodCalled: 'prepareEnvironment(listeners, bootstrapContext, applicationArguments)',
        internalStateChange: 'Broadcasting Event: ApplicationEnvironmentPreparedEvent.',
        highlightEdges: ['boot_e2']
      },
      {
        stepNumber: 3,
        nodeId: 'autoconfiguration_engine',
        title: 'Step 3: Auto-Configuration Class Discovery',
        description: 'AutoConfigurationImportSelector reads META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports.',
        simpleAnalogy: 'Checking what tools are in your trunk to decide what features to enable.',
        whyItMatters: 'Evaluates @ConditionalOnClass, @ConditionalOnMissingBean to auto-configure components.',
        keyTakeaway: 'Spring Boot 3+ reads META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports.',
        methodCalled: 'AutoConfigurationImportSelector.selectImports()',
        internalStateChange: 'Loaded 150+ candidate auto-configuration classes.',
        highlightEdges: ['boot_e3']
      },
      {
        stepNumber: 4,
        nodeId: 'context_refresh_12_phases',
        title: 'Step 4: AbstractApplicationContext.refresh() - 12 Phases',
        description: 'Executes BeanFactoryPostProcessors, registers BeanPostProcessors, executes onRefresh() to boot Tomcat, instantiates non-lazy singletons.',
        simpleAnalogy: 'Starting all engine cylinders and turning on the headlights.',
        whyItMatters: 'Executes the 12 refresh phases, starts embedded Tomcat on port 8080, and instantiates all singletons.',
        keyTakeaway: 'Embedded Tomcat starts in onRefresh() phase, before non-lazy singletons are created.',
        methodCalled: 'AbstractApplicationContext.refresh()',
        internalStateChange: 'Tomcat started on port 8080 (http). All singleton beans instantiated.',
        highlightEdges: []
      }
    ]
  },
  {
    id: 'tx_persistence_scenario',
    viewMode: 'TRANSACTIONS_AND_DATA',
    name: '@Transactional Execution & HikariCP / Hibernate Lifecycle',
    shortTitle: '@Transactional & DB Persistence',
    description: 'Demonstrates declarative transaction interception, ThreadLocal connection binding, HikariCP checkout, dirty checking, and commit.',
    steps: [
      {
        stepNumber: 1,
        nodeId: 'tx_interceptor',
        title: 'Step 1: AOP Interception on @Transactional',
        description: 'Target service method called. CGLIB proxy invokes TransactionInterceptor.invoke(). Inspects TransactionAttribute (REQUIRED, etc.).',
        simpleAnalogy: 'Beginning a bank safe deposit box session with a two-key protocol.',
        whyItMatters: 'AOP proxy intercepts @Transactional to open transaction before method executes.',
        keyTakeaway: 'TransactionInterceptor calls createTransactionIfNecessary().',
        methodCalled: 'TransactionAspectSupport.createTransactionIfNecessary()',
        internalStateChange: 'Determines new transaction is required.',
        highlightEdges: ['tx_e1']
      },
      {
        stepNumber: 2,
        nodeId: 'tx_sync_manager',
        title: 'Step 2: Bind Connection to ThreadLocal',
        description: 'TransactionSynchronizationManager binds ConnectionHolder to the current executing thread.',
        simpleAnalogy: 'Assigning a dedicated safe deposit key to the current teller.',
        whyItMatters: 'Binds ConnectionHolder to ThreadLocal so multiple repository calls share the same connection.',
        keyTakeaway: 'TransactionSynchronizationManager.bindResource(dataSource, connectionHolder).',
        methodCalled: 'TransactionSynchronizationManager.bindResource(dataSource, connectionHolder)',
        internalStateChange: 'ThreadLocal resources map updated with DataSource -> ConnectionHolder.',
        highlightEdges: ['tx_e2']
      },
      {
        stepNumber: 3,
        nodeId: 'hikari_connection_pool',
        title: 'Step 3: HikariCP Lock-Free Connection Borrow',
        description: 'HikariPool borrows active JDBC Connection from ConcurrentBag via thread-local list.',
        simpleAnalogy: 'Borrowing a pen from a fast desk caddy without waiting in line.',
        whyItMatters: 'HikariCP uses lock-free ConcurrentBag and FastList for ultra-low latency checkout.',
        keyTakeaway: 'Checks out active connection from pool with autoCommit=false.',
        methodCalled: 'HikariDataSource.getConnection()',
        internalStateChange: 'Connection state set to STATE_IN_USE; autoCommit set to false.',
        highlightEdges: ['tx_e3']
      },
      {
        stepNumber: 4,
        nodeId: 'hibernate_session_osiv',
        title: 'Step 4: Hibernate Entity Mutation & Flush Commit',
        description: 'Business logic alters entity properties. Hibernate executes Dirty Check, emits SQL UPDATE, and commits JDBC connection.',
        simpleAnalogy: 'Locking the safe, updating the ledger, and signing off the transaction.',
        whyItMatters: 'Dirty checking detects entity mutations, flushes SQL UPDATE, commits JDBC, returns connection.',
        keyTakeaway: 'Connection returned to HikariCP pool and ThreadLocal resources unbound.',
        methodCalled: 'connection.commit() & em.flush()',
        internalStateChange: 'Transaction successfully committed. Connection returned to HikariCP pool.',
        highlightEdges: []
      }
    ]
  }
];
