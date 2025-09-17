import { useId } from "react";

import { CtaButtons } from "../common/CtaButtons";
import styles from "./FinalCtaBanner.module.css";

type CtaConfig = {
  label: string;
  href: string;
  trackingId: string;
};

type FinalCtaBannerProps = {
  title: string;
  subtitle: string;
  primaryCta: CtaConfig;
  secondaryCta: CtaConfig;
};

export function FinalCtaBanner({ title, subtitle, primaryCta, secondaryCta }: FinalCtaBannerProps): JSX.Element {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.banner}>
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.subtitle}>{subtitle}</p>
        <CtaButtons primary={primaryCta} secondary={secondaryCta} align="center" />
      </div>
    </section>
  );
}
