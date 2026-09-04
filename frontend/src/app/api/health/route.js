export const dynamic = 'force-dynamic';

export async function GET() {
  const memory = process.memoryUsage();
  const uptime = process.uptime();

  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptime),
    memory: {
      rssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      externalMB: Math.round((memory.external / 1024 / 1024) * 100) / 100,
    },
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  return Response.json(healthData, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'X-Health-Check': 'pc-alley-frontend-ok'
    }
  });
}
