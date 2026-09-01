import { NextRequest, NextResponse } from "next/server";
import { supaGet } from "@/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const estado = searchParams.get("estado") || "";
  const emailStatus = searchParams.get("emailStatus") || "";
  const sortField = searchParams.get("sortField") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "100");

  // Build Supabase query params
  const params: Record<string, string> = {};

  // Sorting
  params.order = `${sortField}.${sortOrder}`;

  // Pagination
  const offset = (page - 1) * limit;
  params.limit = limit.toString();
  params.offset = offset.toString();

  // Search (ILIKE across multiple fields)
  if (search) {
    params.or = `(empresa.ilike.%${search}%,contacto_nombre.ilike.%${search}%,cargo.ilike.%${search}%)`;
  }

  // Estado filter
  if (estado && estado !== "all") {
    params.estado = `eq.${estado}`;
  } else {
    // Default: exclude descartado
    params.estado = "not.eq.Descartado";
  }

  // Email status filter
  if (emailStatus === "found") {
    // Has email (not empty)
    if (estado && estado !== "all") {
      params.estado = `eq.${estado}`;
    }
    // AND: not null AND not empty string
    params.and = "(contacto_email.not.is.null,contacto_email.neq.)";
  } else if (emailStatus === "missing") {
    if (estado && estado !== "all") {
      params.estado = `eq.${estado}`;
    }
    params.or = `(contacto_email.is.null,contacto_email.eq.)`;
  }

  // Date range
  if (searchParams.get("dateFrom")) {
    params.created_at = `gte.${searchParams.get("dateFrom")}T00:00:00`;
  }
  if (searchParams.get("dateTo")) {
    params.created_at = `lte.${searchParams.get("dateTo")}T23:59:59`;
  }

  const { data: contacts, total } = await supaGet(params);

  return NextResponse.json({
    contacts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
