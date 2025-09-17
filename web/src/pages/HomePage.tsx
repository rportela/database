import { useEffect } from "react";

import { ArchDiagram } from "../components/home/ArchDiagram";
import { FinalCtaBanner } from "../components/home/FinalCtaBanner";
import { Footer } from "../components/home/Footer";
import { FeaturesGrid } from "../components/home/FeaturesGrid";
import { Hero } from "../components/home/Hero";
import { PricingPreview } from "../components/home/PricingPreview";
import { ServerlessIcebergExplainer } from "../components/home/ServerlessIcebergExplainer";
import { SocialProof } from "../components/home/SocialProof";
import { ValueForManagers } from "../components/home/ValueForManagers";
import { homePageContent } from "../content/homePageContent";
import styles from "./HomePage.module.css";

type MetaCleanup = () => void;

function setMetaTag(attribute: "name" | "property", key: string, value: string): MetaCleanup {
  const head = document.head;
  let tag = head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  let created = false;
  const previous = tag?.getAttribute("content") ?? null;

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    head.appendChild(tag);
    created = true;
  }

  tag.setAttribute("content", value);

  return () => {
    if (!tag) {
      return;
    }

    if (created) {
      tag.remove();
    } else if (previous !== null) {
      tag.setAttribute("content", previous);
    }
  };
}

function setCanonical(url: string): [HTMLLinkElement | null, boolean, string] {
  const head = document.head;
  let link = head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  let created = false;
  const previous = link?.getAttribute("href") ?? "";

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    head.appendChild(link);
    created = true;
  }

  link.setAttribute("href", url);
  return [link, created, previous];
}

export function HomePage(): JSX.Element {
  const { hero, valueForManagers, features, explainer, arch, socialProof, pricing, finalCta, footer, seo } =
    homePageContent;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const previousTitle = document.title;
    document.title = seo.title;

    const cleanups: MetaCleanup[] = [];
    cleanups.push(setMetaTag("name", "description", seo.description));
    cleanups.push(setMetaTag("property", "og:title", seo.title));
    cleanups.push(setMetaTag("property", "og:description", seo.description));
    const canonicalUrl = `${window.location.origin}/`;
    cleanups.push(setMetaTag("property", "og:url", canonicalUrl));
    const heroImageUrl = new URL(arch.image.src, window.location.origin).toString();
    cleanups.push(setMetaTag("property", "og:image", heroImageUrl));
    cleanups.push(setMetaTag("name", "twitter:card", "summary_large_image"));
    cleanups.push(setMetaTag("name", "twitter:title", seo.title));
    cleanups.push(setMetaTag("name", "twitter:description", seo.description));
    cleanups.push(setMetaTag("name", "twitter:image", heroImageUrl));

    const [canonicalTag, created, previousCanonical] = setCanonical(canonicalUrl);

    return () => {
      document.title = previousTitle;
      cleanups.forEach((cleanup) => cleanup());
      if (canonicalTag) {
        if (created) {
          canonicalTag.remove();
        } else {
          canonicalTag.setAttribute("href", previousCanonical);
        }
      }
    };
  }, [arch.image.src, seo.description, seo.title]);

  return (
    <div className={styles.page}>
      <header className={styles.heroHeader}>
        <nav className={styles.navbar} aria-label="Primary">
          <a className={styles.brand} href="/">
            {footer.company}
          </a>
          <div className={styles.navLinks}>
            <a href="/pricing">Pricing</a>
            <a href="/docs">Docs</a>
            <a href="/login">Sign in</a>
          </div>
        </nav>
        <Hero {...hero} />
      </header>
      <main className={styles.main}>
        <ValueForManagers {...valueForManagers} />
        <FeaturesGrid {...features} />
        <ServerlessIcebergExplainer {...explainer} />
        <ArchDiagram {...arch} />
        <SocialProof {...socialProof} />
        <PricingPreview {...pricing} />
        <FinalCtaBanner {...finalCta} />
      </main>
      <Footer {...footer} />
    </div>
  );
}

export default HomePage;
