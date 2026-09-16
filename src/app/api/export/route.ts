import { NextResponse } from 'next/server';
import { buildExportPayload, buildExportFilename } from '@/lib/export';

// GET /api/export — 전체 자료를 JSON 파일 하나로 다운로드 (C36)
export async function GET() {
  try {
    const payload = await buildExportPayload();
    const filename = buildExportFilename();

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[GET /api/export]', error);
    return NextResponse.json(
      { error: '내보내기에 실패했습니다' },
      { status: 500 }
    );
  }
}