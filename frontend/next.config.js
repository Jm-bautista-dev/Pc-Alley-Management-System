/** @type {import('next').NextConfig} */
const nextConfig = { allowedDevOrigins: ['192.168.1.5', 'localhost'],
  async rewrites() {
    const backendBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      "http://localhost:5001";

    return [
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendBaseUrl}/uploads/:path*`,
      },
      {
        source: "/socket.io",
        destination: `${backendBaseUrl}/socket.io/`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendBaseUrl}/socket.io/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/analytics',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
