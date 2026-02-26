// app/api/long-claims/[id]/pdf/route.ts
import { NextResponse } from "next/server";
import { generateLongClaimInvoicePDF } from "@/lib/pdf-generator2";
import api from "@/lib/axios"; // ← your axios instance with auth

export async function POST(
    request: Request,

) {
    const { claimId } = await request.json();

    try {
        // ────────────────────────────────────────────────
        // 1. Fetch the long claim itself (has starting_date & ending_date)
        // ────────────────────────────────────────────────
        const claimRes = await api.get(`/api/long-claims/${claimId}`, {
            headers: { requiresAuth: true },
        });

        if (!claimRes.data.success || !claimRes.data.data) {
            return NextResponse.json(
                { error: `Long claim ${claimId} not found` },
                { status: 404 }
            );
        }

        const longClaim = claimRes.data.data;
        // Expected shape:
        // {
        //   id: number,
        //   starting_date: string | null,   // e.g. "2026-02-01"
        //   ending_date: string | null,
        //   invoice_sent: boolean
        // }

        const period = {
            starting_date: longClaim.starting_date,
            ending_date: longClaim.ending_date,
        };

        // Optional: early exit if dates are missing (depends on your business rules)
        if (!period.starting_date || !period.ending_date) {
            return NextResponse.json(
                { error: "Long claim is missing start and/or end date" },
                { status: 400 }
            );
        }

        // ────────────────────────────────────────────────
        // 2. Get cars for this long claim
        // ────────────────────────────────────────────────
        const carsRes = await api.get(`/api/long-claim/${claimId}/cars`, {
            headers: { requiresAuth: true },
        });

        const claimCars = carsRes.data.data || [];

        if (claimCars.length === 0) {
            return NextResponse.json(
                { error: "No cars found in this long claim" },
                { status: 404 }
            );
        }

        // ────────────────────────────────────────────────
        // 3. Get claimants for each car (in parallel)
        // ────────────────────────────────────────────────
        const claimantsByCar: Record<number, any[]> = {};

        await Promise.all(
            claimCars.map(async (car: any) => {
                try {
                    const res = await api.get(`/api/car/${car.id}/claimants`, {
                        headers: { requiresAuth: true },
                    });
                    claimantsByCar[car.id] = res.data.data || [];
                } catch (err) {
                    console.error(`Failed to load claimants for car ${car.id}:`, err);
                    claimantsByCar[car.id] = [];
                }
            })
        );

        // ────────────────────────────────────────────────
        // 4. Calculate totals
        // ────────────────────────────────────────────────
        const totalDelivery = Object.values(claimantsByCar)
            .flat()
            .reduce((sum: number, cl: any) => sum + (Number(cl.delivery_charges) || 0), 0);

        const bill = totalDelivery + 58 * claimCars.length;

        // ────────────────────────────────────────────────
        // 5. Generate and return PDF
        // ────────────────────────────────────────────────
        const pdfBuffer = await generateLongClaimInvoicePDF({
            claimId: claimId, // make sure it's number if your function expects it
            period,
            claimCars,
            claimantsByCar,
            totalDelivery,
            bill,
        });

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Invoice-LongClaim-${claimId}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("PDF generation failed:", error);
        return NextResponse.json(
            {
                error: "Failed to generate long claim invoice",
                message: error.message,
            },
            { status: 500 }
        );
    }
}