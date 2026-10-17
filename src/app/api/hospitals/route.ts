import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/store/mockDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('id');

    if (hospitalId) {
      const hospital = mockDb.getHospitalById(hospitalId);
      if (!hospital) {
        return NextResponse.json({ success: false, error: 'Hospital not found' }, { status: 404 });
      }
      const departments = mockDb.getDepartments(hospitalId);
      const doctors = mockDb.getDoctors(hospitalId);
      return NextResponse.json({ success: true, hospital, departments, doctors });
    }

    const hospitals = mockDb.getHospitals();
    const departments = mockDb.getDepartments();
    return NextResponse.json({ success: true, hospitals, departments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch hospital data' },
      { status: 500 }
    );
  }
}
