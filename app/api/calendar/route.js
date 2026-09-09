import { NextResponse } from 'next/server';
import { getCalendarData, updateCalendarEvent, deleteCalendarEvent } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch all calendar events from Google Sheets
 */
export async function GET() {
  try {
    const events = await getCalendarData();
    return NextResponse.json({ success: true, data: events }, { status: 200 });
  } catch (error) {
    console.error('[Calendar API GET Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch calendar data from Google Sheets',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update an existing event in Google Sheets
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { rowIndex, sheetTitle, date, grade, subject, type, description, id } = body;

    if (!rowIndex && !id) {
      return NextResponse.json(
        { success: false, error: 'Missing required identifier (rowIndex or id).' },
        { status: 400 }
      );
    }

    const result = await updateCalendarEvent({
      rowIndex: Number(rowIndex),
      sheetTitle,
      date,
      grade,
      subject,
      type,
      description,
      id,
    });

    return NextResponse.json(
      { success: true, message: 'Event successfully updated.', result },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Calendar API PUT Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update event in Google Sheets',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove an event row from Google Sheets
 */
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { rowIndex, sheetNumericId, sheetTitle, id } = body;

    if (!rowIndex && !id) {
      return NextResponse.json(
        { success: false, error: 'Missing required identifier (rowIndex or id).' },
        { status: 400 }
      );
    }

    const result = await deleteCalendarEvent({
      rowIndex: Number(rowIndex),
      sheetNumericId: sheetNumericId !== undefined ? Number(sheetNumericId) : undefined,
      sheetTitle,
      id,
    });

    return NextResponse.json(
      { success: true, message: 'Event successfully deleted.', result },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Calendar API DELETE Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete event from Google Sheets',
      },
      { status: 500 }
    );
  }
}
