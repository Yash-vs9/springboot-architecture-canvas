import { useState } from 'react';
import type { FC } from 'react';
import { 
  X, 
  ShieldCheck, 
  Search,
  ArrowRight
} from 'lucide-react';

interface FilterExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

interface FilterEntry {
  order: number;
  name: string;
  className: string;
  location: 'Tomcat Servlet Container' | 'Delegating Bridge' | 'Spring Security FilterChain';
  whatItDoes: string;
  mutatesThreadLocal: string;
  configHook: string;
  nodeId?: string;
}

const ALL_SPRING_FILTERS: FilterEntry[] = [
  {
    order: 1,
    name: 'CharacterEncodingFilter',
    className: 'org.springframework.web.filter.CharacterEncodingFilter',
    location: 'Tomcat Servlet Container',
    whatItDoes: 'Forces UTF-8 character encoding on HttpServletRequest before any parameter read operations occur.',
    mutatesThreadLocal: 'None',
    configHook: 'server.servlet.encoding.charset=UTF-8',
    nodeId: 'character_encoding_filter'
  },
  {
    order: 2,
    name: 'CorsFilter',
    className: 'org.springframework.web.filter.CorsFilter',
    location: 'Tomcat Servlet Container',
    whatItDoes: 'Intercepts HTTP OPTIONS pre-flight requests and injects Access-Control-Allow-Origin / Headers.',
    mutatesThreadLocal: 'None',
    configHook: '@CrossOrigin or CorsConfigurationSource bean',
  },
  {
    order: 3,
    name: 'DelegatingFilterProxy',
    className: 'org.springframework.web.filter.DelegatingFilterProxy',
    location: 'Delegating Bridge',
    whatItDoes: 'Crucial bridge between Tomcat and Spring ApplicationContext. Lazily retrieves bean "springSecurityFilterChain" and delegates execution.',
    mutatesThreadLocal: 'None',
    configHook: 'spring.security.filter.order=-100',
    nodeId: 'delegating_filter_proxy'
  },
  {
    order: 4,
    name: 'FilterChainProxy',
    className: 'org.springframework.security.web.FilterChainProxy',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Spring Security central dispatcher. Matches incoming URL to configured SecurityFilterChain beans.',
    mutatesThreadLocal: 'SecurityContextHolder (clears in finally)',
    configHook: '@EnableWebSecurity',
    nodeId: 'filter_chain_proxy'
  },
  {
    order: 5,
    name: 'SecurityContextHolderFilter',
    className: 'org.springframework.security.web.context.SecurityContextHolderFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Loads SecurityContext from repository (Session or Token) into ThreadLocal SecurityContextHolder. Clears it on request completion.',
    mutatesThreadLocal: 'ThreadLocal<SecurityContext>',
    configHook: 'http.securityContext(...)',
    nodeId: 'sec_filter_context'
  },
  {
    order: 6,
    name: 'HeaderWriterFilter',
    className: 'org.springframework.security.web.header.HeaderWriterFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Injects defensive security headers (X-Content-Type-Options: nosniff, X-Frame-Options: DENY, HSTS).',
    mutatesThreadLocal: 'None',
    configHook: 'http.headers(headers -> headers.frameOptions(...))',
  },
  {
    order: 7,
    name: 'CsrfFilter',
    className: 'org.springframework.security.web.csrf.CsrfFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Validates CSRF token header for state-mutating verbs (POST, PUT, DELETE). Rejects forged cross-site requests.',
    mutatesThreadLocal: 'Request attribute: _csrf',
    configHook: 'http.csrf(csrf -> csrf.disable())',
    nodeId: 'sec_filter_csrf'
  },
  {
    order: 8,
    name: 'LogoutFilter',
    className: 'org.springframework.security.web.authentication.logout.LogoutFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Catches /logout requests, invalidates session, clears cookies, and clears SecurityContextHolder.',
    mutatesThreadLocal: 'SecurityContextHolder.clearContext()',
    configHook: 'http.logout(logout -> logout.logoutUrl("/logout"))',
  },
  {
    order: 9,
    name: 'BearerTokenAuthenticationFilter',
    className: 'org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Extracts Bearer <JWT> from Authorization header, verifies signature via JwtDecoder, and binds authenticated Principal.',
    mutatesThreadLocal: 'SecurityContextHolder.setAuthentication(jwtToken)',
    configHook: 'http.oauth2ResourceServer(oauth -> oauth.jwt())',
    nodeId: 'sec_filter_auth'
  },
  {
    order: 10,
    name: 'UsernamePasswordAuthenticationFilter',
    className: 'org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Extracts username and password from POST /login form submissions and delegates to AuthenticationManager.',
    mutatesThreadLocal: 'SecurityContextHolder.setAuthentication(...)',
    configHook: 'http.formLogin(...)',
  },
  {
    order: 11,
    name: 'RequestCacheAwareFilter',
    className: 'org.springframework.security.web.savedrequest.RequestCacheAwareFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Replays the original cached request URL that was interrupted by a login redirect.',
    mutatesThreadLocal: 'None',
    configHook: 'http.requestCache(...)',
  },
  {
    order: 12,
    name: 'SecurityContextHolderAwareRequestFilter',
    className: 'org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Wraps HttpServletRequest so standard Servlet methods like request.isUserInRole() consult Spring Security.',
    mutatesThreadLocal: 'Wraps HttpServletRequest',
    configHook: 'Default enabled',
  },
  {
    order: 13,
    name: 'AnonymousAuthenticationFilter',
    className: 'org.springframework.security.web.authentication.AnonymousAuthenticationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Assigns an AnonymousAuthenticationToken if no authentication is present, avoiding null checks.',
    mutatesThreadLocal: 'SecurityContextHolder (sets Anonymous token)',
    configHook: 'http.anonymous(...)',
  },
  {
    order: 14,
    name: 'ExceptionTranslationFilter',
    className: 'org.springframework.security.web.access.ExceptionTranslationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Catches AccessDeniedException (returns 403) and AuthenticationException (starts 401 / login challenge).',
    mutatesThreadLocal: 'None',
    configHook: 'http.exceptionHandling(ex -> ex.authenticationEntryPoint(...))',
  },
  {
    order: 15,
    name: 'AuthorizationFilter',
    className: 'org.springframework.security.web.access.intercept.AuthorizationFilter',
    location: 'Spring Security FilterChain',
    whatItDoes: 'Final security barrier: checks AuthorizationManager rules before request enters DispatcherServlet.',
    mutatesThreadLocal: 'None',
    configHook: 'http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated())',
    nodeId: 'sec_filter_authz'
  }
];

export const FilterExplorerModal: FC<FilterExplorerModalProps> = ({
  isOpen,
  onClose,
  onSelectNode,
}) => {
  const [search, setSearch] = useState<string>('');

  if (!isOpen) return null;

  const filtered = ALL_SPRING_FILTERS.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.className.toLowerCase().includes(search.toLowerCase()) ||
      f.whatItDoes.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[88vh] bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Spring Boot Filter Architecture & Pipeline Directory
              </h2>
              <p className="text-xs text-[#8b949e]">
                Where each filter is located, exact runtime execution order, and its underlying engineering purpose
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar & Architecture Explanation */}
        <div className="px-5 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search filters by name, class, or purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
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

            return (
              <div
                key={filter.order}
                className="p-4 bg-[#161b22] rounded-xl border border-[#30363d] hover:border-[#58a6ff]/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center font-mono font-bold text-xs text-[#92ec56] flex-shrink-0 mt-0.5">
                    #{filter.order}
                  </span>

                  <div className="min-w-0">
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

                    <p className="text-xs text-[#c9d1d9] leading-relaxed mb-2">
                      {filter.whatItDoes}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8b949e]">
                      <div>
                        <span className="text-[#58a6ff]">ThreadLocal: </span>
                        <span className="font-mono">{filter.mutatesThreadLocal}</span>
                      </div>
                      <span className="text-[#30363d]">•</span>
                      <div>
                        <span className="text-[#e3b341]">Config: </span>
                        <span className="font-mono">{filter.configHook}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {filter.nodeId && (
                  <button
                    onClick={() => {
                      onSelectNode(filter.nodeId!);
                      onClose();
                    }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#21262d] text-[#58a6ff] hover:bg-[#30363d] text-xs font-medium flex items-center gap-1.5 transition-colors self-start md:self-center"
                  >
                    <span>View on Canvas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
          <span>Showing {filtered.length} of {ALL_SPRING_FILTERS.length} canonical Spring filters</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#238636] text-white hover:bg-[#2ea043] font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
