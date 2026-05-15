"use strict";(()=>{var e={};e.id=9684,e.ids=[9684],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},5443:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>m,patchFetch:()=>f,requestAsyncStorage:()=>l,routeModule:()=>c,serverHooks:()=>g,staticGenerationAsyncStorage:()=>h});var s={};r.r(s),r.d(s,{GET:()=>d,revalidate:()=>p});var a=r(9303),o=r(8716),i=r(3131),n=r(7070);let u=`
  query GetProducts($first: Int) {
    products(first: $first, where: { status: "publish", orderby: { field: MENU_ORDER, order: ASC } }) {
      nodes {
        id
        name
        slug
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockStatus
          stockQuantity
          image { sourceUrl }
          productCategories { nodes { name } }
          productTags { nodes { slug } }
        }
        ... on VariableProduct {
          price
          regularPrice
          image { sourceUrl }
          productCategories { nodes { name } }
          productTags { nodes { slug } }
          variations(first: 20) {
            nodes {
              stockStatus
              stockQuantity
              attributes { nodes { name value } }
            }
          }
        }
      }
    }
  }
`,p=60;async function d(){let e=await fetch("https://lightpink-rook-704850.hostingersite.com/graphql",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:u,variables:{first:100}}),next:{revalidate:60}});if(!e.ok)return n.NextResponse.json({error:"GraphQL fetch failed"},{status:502});let{data:t,errors:r}=await e.json();return r?n.NextResponse.json({error:r[0].message},{status:500}):n.NextResponse.json(t,{headers:{"Cache-Control":"s-maxage=60, stale-while-revalidate=30"}})}let c=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/products/route",pathname:"/api/products",filename:"route",bundlePath:"app/api/products/route"},resolvedPagePath:"/Users/manuelnavarro/Hype-Github/hypestyle-launchpad/app/api/products/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:l,staticGenerationAsyncStorage:h,serverHooks:g}=c,m="/api/products/route";function f(){return(0,i.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:h})}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[9276,5972],()=>r(5443));module.exports=s})();