export const homePageContent = {
  hero: {
    title: "Serverless Lakehouse on Open Apache Iceberg",
    subtitle: "Run analytics on your cloud storage with zero ops, predictable costs, and no vendor lock-in.",
    primaryCta: { label: "Start free", href: "/signup", trackingId: "home_hero_start_free" },
    secondaryCta: { label: "Book a demo", href: "/demo", trackingId: "home_hero_book_demo" },
    logos: [{ alt: "Customer A", src: "/logos/customer-a.svg" }],
  },
  valueForManagers: {
    headline: "Outcomes leaders care about",
    bullets: [
      { title: "Cut TCO", body: "Pay only when you query; scale-to-zero between workloads." },
      { title: "Move faster", body: "Spin up data products in days, not quarters—no clusters to babysit." },
      { title: "Own your data", body: "Open Iceberg tables on your object storage—portable across clouds." },
      { title: "Reduce risk", body: "Fine-grained governance, time travel, and audited history by design." },
    ],
    kicker: "Built for modern data teams and the executives who sponsor them.",
  },
  features: {
    headline: "What you get on day one",
    features: [
      {
        icon: "bolt",
        title: "Instant analytics",
        body: "SQL over Iceberg with DuckDB; Trino/BigQuery/Snowflake optional later.",
        href: "/features#analytics",
      },
      {
        icon: "shield",
        title: "Enterprise-grade isolation",
        body: "Multi-tenant security with SSO and role-based access.",
        href: "/features#security",
      },
      {
        icon: "scales",
        title: "Predictable pricing",
        body: "Clear limits by plan; no surprise compute bills.",
        href: "/pricing",
      },
      {
        icon: "layers",
        title: "Future-proof format",
        body: "Schema evolution, ACID, and time travel on Apache Iceberg.",
        href: "/features#iceberg",
      },
    ],
  },
  explainer: {
    headline: "What is “serverless Apache Iceberg”?",
    paragraphs: [
      "Apache Iceberg is an open table format that adds reliability features—like ACID transactions, schema evolution, and time travel—on top of your cloud object storage.",
      "Serverless means you don’t manage clusters—compute appears when you run a query, then scales to zero.",
    ],
    bullets: [
      "Open standard: no vendor lock-in; works across GCS, S3, and Azure Blob.",
      "Lower ops: no clusters to patch, right-size, or idle.",
      "Governance built-in: snapshots and audited history for compliance.",
    ],
    learnMoreHref: "/docs/why-iceberg",
  },
  arch: {
    headline: "Portable by design",
    image: { src: "/img/arch.svg", alt: "High-level architecture", width: 1024, height: 640 },
    legend: [
      "Control plane: identity, entitlements, billing",
      "Data plane: Iceberg tables on your object storage",
      "Query engine: serverless, plug-in backends",
    ],
  },
  socialProof: {
    headline: "Trusted by data-led teams",
    logos: [
      { alt: "Logo 1", src: "/logos/1.svg" },
      { alt: "Logo 2", src: "/logos/2.svg" },
    ],
    testimonial: {
      quote: "We slashed analytics costs by 48% while shipping faster.",
      author: "Jane Smith",
      role: "VP Data, ExampleCo",
    },
    badges: [{ label: "SOC 2 in progress", iconSrc: "/icons/shield.svg" }],
  },
  pricing: {
    headline: "Simple, transparent plans",
    plans: [
      { name: "Starter", summary: "For small teams getting started", startingAt: "$0", href: "/pricing#starter" },
      { name: "Pro", summary: "For growing teams", startingAt: "$499/mo", href: "/pricing#pro" },
    ],
    note: "Enterprise pricing available—contact sales.",
  },
  finalCta: {
    title: "Ready to try the open lakehouse?",
    subtitle: "Start free in minutes or book a guided demo.",
    primaryCta: { label: "Start free", href: "/signup", trackingId: "home_final_start_free" },
    secondaryCta: { label: "Book a demo", href: "/demo", trackingId: "home_final_book_demo" },
  },
  seo: {
    title: "Serverless Lakehouse on Apache Iceberg — Fast, Open, Cost-Efficient",
    description:
      "Run analytics on your cloud storage with an open Iceberg table format. No clusters, no lock-in, predictable pricing.",
  },
  footer: {
    company: "Lakeview",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Features", href: "/features" },
          { label: "Pricing", href: "/pricing" },
          { label: "Docs", href: "/docs" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "/about" },
          { label: "Careers", href: "/careers" },
          { label: "Blog", href: "/blog" },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "Security", href: "/security" },
          { label: "Compliance", href: "/compliance" },
          { label: "Support", href: "/support" },
        ],
      },
    ],
    contact: { label: "hello@lakeview.io", href: "mailto:hello@lakeview.io" },
    legal: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Status", href: "https://status.lakeview.io" },
    ],
    copyright: "© 2024 Lakeview Data, Inc. All rights reserved.",
  },
} as const;

export type HomePageContent = typeof homePageContent;
