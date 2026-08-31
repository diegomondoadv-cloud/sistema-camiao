/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A camada de apresentação (Next.js) fica em src/app; as demais camadas
  // (domain, application, infrastructure, shared) ficam em src/ conforme a
  // arquitetura descrita no PLANO_DO_SISTEMA.md.
  typedRoutes: true,
};

export default nextConfig;
