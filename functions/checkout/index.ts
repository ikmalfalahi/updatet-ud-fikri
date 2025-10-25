// functions/checkout/index.ts
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY env");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const body = await req.json();

    // Basic validation
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid payload: items required" }), { status: 400 });
    }

    // OPTIONAL: idempotency (prevent duplicate orders on retries)
    const idemKey = req.headers.get("Idempotency-Key");
    if (idemKey) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("promo_code", idemKey) // If you store idempotency key in promo_code or create an idempotency column
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ order_id: existing.id }), { status: 200 });
      }
    }

    // Build JSON for RPC: include only necessary fields and types
    const orderJson = {
      customer_name: body.customer_name || "",
      customer_email: body.customer_email || "",
      customer_phone: body.customer_phone || "",
      shipping_address: body.shipping_address || "",
      shipping_city: body.shipping_city || "",
      shipping_cost: Number(body.shipping_cost || 0),
      promo_code: body.promo_code || null,
      items: body.items.map((it: any) => ({
        id: it.id,
        qty: Number(it.qty),
        price_snapshot: it.price_snapshot ? Number(it.price_snapshot) : null,
      })),
    };

    // Call RPC
    const resp = await supabase.rpc("create_order", { order_json: orderJson });

    if (resp.error) {
      console.error("RPC error:", resp.error);
      return new Response(JSON.stringify({ error: resp.error.message || "RPC failed" }), { status: 500 });
    }

    const orderId = resp.data;
    return new Response(JSON.stringify({ order_id: orderId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
});
