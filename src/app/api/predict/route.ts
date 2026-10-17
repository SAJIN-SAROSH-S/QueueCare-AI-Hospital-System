import { NextRequest, NextResponse } from 'next/server';
import { getPredictedWaitTime } from '@/lib/prediction/estimator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await getPredictedWaitTime({
      patientsAhead: body.patientsAhead ?? 0,
      currentConsultationElapsedMinutes: body.currentConsultationElapsedMinutes ?? 0,
      doctorAvgConsultationMinutes: body.doctorAvgConsultationMinutes ?? 15,
      recentClinicDelayMinutes: body.recentClinicDelayMinutes ?? 0,
      doctorBreakMinutes: body.doctorBreakMinutes ?? 0,
      isEmergencyOverride: Boolean(body.isEmergencyOverride),
    });

    return NextResponse.json({ success: true, prediction: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Wait-time prediction failed' },
      { status: 500 }
    );
  }
}
