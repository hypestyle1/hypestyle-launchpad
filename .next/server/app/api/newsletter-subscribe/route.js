"use strict";(()=>{var e={};e.id=2309,e.ids=[2309],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4980:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>x,patchFetch:()=>y,requestAsyncStorage:()=>f,routeModule:()=>c,serverHooks:()=>g,staticGenerationAsyncStorage:()=>u});var a={};r.r(a),r.d(a,{POST:()=>l});var s=r(9303),o=r(8716),n=r(3131),i=r(7070);let p=(process.env.BREVO_API_KEY||"").replace(/^﻿/,"").trim(),d=process.env.NEXT_PUBLIC_FRONTEND_URL||"https://hypestyle.com.ar";async function l(e){try{let{email:t}=await e.json();if(!t||!t.includes("@"))return i.NextResponse.json({error:"Invalid email"},{status:400});let r=await fetch("https://api.brevo.com/v3/contacts",{method:"POST",headers:{"api-key":p,"Content-Type":"application/json"},body:JSON.stringify({email:t,listIds:[3],updateEnabled:!0})});if(!r.ok){let e=await r.json().catch(()=>({}));if(e?.code!=="duplicate_parameter")return i.NextResponse.json({error:"Brevo error",detail:e},{status:500})}return await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"api-key":p,"Content-Type":"application/json"},body:JSON.stringify({sender:{name:"Hypestyle",email:"hypestylearg@gmail.com"},to:[{email:t}],subject:"\xa1Tu 10% off te espera — Hypestyle!",htmlContent:`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;">
            <img src="${d}/logo-hypestyle-2026.png" alt="Hypestyle" width="130" style="height:auto;display:inline-block;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 24px;background:#fff;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111;">\xa1Ya sos parte de Hypestyle!</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
              Te regalamos un <strong>10% off</strong> en tu pr\xf3xima compra. Us\xe1 el c\xf3digo al finalizar tu pedido — aplica sobre cualquier medio de pago.
            </p>
          </td>
        </tr>

        <!-- Cup\xf3n -->
        <tr>
          <td style="padding:0 40px 28px;background:#fff;">
            <div style="background:#f8f8f8;border:1px dashed #ccc;border-radius:6px;padding:20px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#999;">Tu c\xf3digo de descuento</p>
              <p style="margin:0 0 12px;font-size:28px;font-weight:800;color:#111;letter-spacing:0.06em;">HYPE10</p>
              <p style="margin:0;font-size:12px;color:#888;">10% off \xb7 V\xe1lido para tu primera compra</p>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 32px;background:#fff;">
            <a href="${d}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:14px 32px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
              Ver la tienda
            </a>
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
</html>`})}),i.NextResponse.json({ok:!0})}catch(e){return i.NextResponse.json({error:String(e?.message||e)},{status:500})}}let c=new s.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/newsletter-subscribe/route",pathname:"/api/newsletter-subscribe",filename:"route",bundlePath:"app/api/newsletter-subscribe/route"},resolvedPagePath:"/Users/manuelnavarro/Hype-Github/hypestyle-launchpad/app/api/newsletter-subscribe/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:f,staticGenerationAsyncStorage:u,serverHooks:g}=c,x="/api/newsletter-subscribe/route";function y(){return(0,n.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:u})}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[9276,5972],()=>r(4980));module.exports=a})();