"use strict";(()=>{var e={};e.id=4560,e.ids=[4560],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3868:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>u,patchFetch:()=>h,requestAsyncStorage:()=>x,routeModule:()=>m,serverHooks:()=>y,staticGenerationAsyncStorage:()=>f});var o={};a.r(o),a.d(o,{POST:()=>g});var r=a(9303),n=a(8716),i=a(3131),d=a(7070);let p=(process.env.BREVO_API_KEY||"").replace(/^﻿/,"").trim(),s=process.env.NEXT_PUBLIC_FRONTEND_URL||"https://hypestyle.com.ar",l={transferencia:"Transferencia / dep\xf3sito bancario",mercadopago:"Mercado Pago",tarjeta:"Mercado Pago (tarjeta)",paypal:"PayPal"};function c(e){return"$ "+e.toLocaleString("es-AR")}async function g(e){try{let t=await e.json();if(!t?.email||!t?.orderNum)return d.NextResponse.json({error:"Missing fields"},{status:400});let a=(e,t,a)=>fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"api-key":p,"Content-Type":"application/json"},body:JSON.stringify({sender:{name:"Hypestyle",email:"hypestylearg@gmail.com"},to:[e],subject:t,htmlContent:a})}),o=await a({email:t.email,name:`${t.nombre} ${t.apellido}`},`Pedido #${t.orderNum} confirmado — Hypestyle`,function(e){let t=e.items.map(e=>`
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:13px;color:#111;font-weight:600;">${e.name}</span><br/>
        <span style="font-size:12px;color:#888;">Talle: ${e.size} \xb7 Cant: ${e.quantity}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#111;white-space:nowrap;">
        ${c(e.price*e.quantity)}
      </td>
    </tr>
  `).join(""),a="transfer"===e.paymentMethod?`
    <div style="background:#f8f8f8;border-radius:6px;padding:16px;margin:24px 0;font-size:13px;color:#333;">
      <strong>Instrucciones para tu transferencia:</strong><br/><br/>
      Alias: <strong>HYPESTYLE.MP</strong><br/>
      Titular: Hypestyle<br/><br/>
      Una vez realizada, envi\xe1 el comprobante por Instagram a <strong>@hypestylearg</strong> con tu n\xfamero de pedido.
    </div>
  `:"";return`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;">
            <img src="${s}/logo-hypestyle-2026.png" alt="Hypestyle" width="140" style="height:auto;display:inline-block;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#999;">Pedido #${e.orderNum}</p>
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111;">\xa1Gracias por tu compra!</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">
              Hola ${e.nombre}, recibimos tu pedido y ya estamos trabajando en \xe9l.
              Te avisamos cuando est\xe9 en camino.
            </p>

            ${a}

            <!-- Items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
              ${t}
            </table>

            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr>
                <td style="padding:14px 0;font-size:14px;font-weight:700;color:#111;">Total</td>
                <td style="padding:14px 0;text-align:right;font-size:16px;font-weight:700;color:#111;">${c(e.total)}</td>
              </tr>
            </table>

            <!-- Shipping note -->
            <p style="margin:24px 0 0;font-size:12px;color:#888;background:#f8f8f8;border-radius:6px;padding:12px 16px;">
              Env\xedo por Andreani — 5 a 10 d\xedas h\xe1biles a partir de la confirmaci\xf3n del pago.
            </p>

            ${e.wcOrderId&&e.orderKey?`
            <!-- Tracking CTA -->
            <div style="margin-top:24px;text-align:center;">
              <a href="${s}/seguimiento?pedido=${e.wcOrderId}&clave=${e.orderKey}"
                 style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:13px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-radius:2px;">
                Seguir mi pedido →
              </a>
              <p style="margin:8px 0 0;font-size:11px;color:#aaa;">El estado se actualiza cuando el env\xedo es despachado.</p>
            </div>
            `:""}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;">
              \xbfDudas? Escribinos por
              <a href="https://instagram.com/hypestylearg" style="color:#111;font-weight:600;">@hypestylearg</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`}(t));if(!o.ok){let e=await o.json();return console.error("[brevo]",e),d.NextResponse.json({error:"Brevo error",detail:e},{status:500})}return a({email:"hypestylearg@gmail.com",name:"Hypestyle Admin"},`🛍 Nueva venta #${t.orderNum} — ${l[t.paymentMethod]||t.paymentMethod||"Sin m\xe9todo"}`,function(e){let t=l[e.paymentMethod]||e.paymentMethod||"No especificado",a=(e.items||[]).map(e=>`<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;">${e.name} — Talle ${e.size} x${e.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;text-align:right;">${c(e.price*e.quantity)}</td></tr>`).join("");return`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f5f5f5;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#0a0a0a;padding:16px 24px;">
      <span style="color:#fff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Nueva venta — Hypestyle</span>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;">Pedido #${e.orderNum}</p>
      <table style="width:100%;margin-bottom:12px;">${a}</table>
      <p style="font-size:15px;font-weight:700;text-align:right;margin:8px 0 20px;">Total: ${c(e.total)}</p>
      <table style="width:100%;font-size:13px;color:#444;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#888;width:120px;">Medio de pago</td><td style="padding:4px 0;font-weight:600;color:${"transferencia"===e.paymentMethod?"#15803d":"#111"};">${t}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Cliente</td><td style="padding:4px 0;">${e.nombre} ${e.apellido}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Email</td><td style="padding:4px 0;">${e.email}</td></tr>
        ${e.ciudad?`<tr><td style="padding:4px 0;color:#888;">Ubicaci\xf3n</td><td style="padding:4px 0;">${e.ciudad}, ${e.provincia}</td></tr>`:""}
      </table>
    </div>
  </div>
</body></html>`}(t)).catch(()=>{}),d.NextResponse.json({ok:!0})}catch(e){return console.error("[send-confirmation]",e),d.NextResponse.json({error:"Internal error",detail:String(e?.message||e)},{status:500})}}let m=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/send-confirmation/route",pathname:"/api/send-confirmation",filename:"route",bundlePath:"app/api/send-confirmation/route"},resolvedPagePath:"/Users/manuelnavarro/Hype-Github/hypestyle-launchpad/app/api/send-confirmation/route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:x,staticGenerationAsyncStorage:f,serverHooks:y}=m,u="/api/send-confirmation/route";function h(){return(0,i.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:f})}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),o=t.X(0,[9276,5972],()=>a(3868));module.exports=o})();