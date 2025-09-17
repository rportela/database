import { CtaButtons } from "../common/CtaButtons";
import { LogoRow } from "../common/LogoRow";
import styles from "./Hero.module.css";

type CtaConfig = {
  label: string;
  href: string;
  trackingId: string;
};

type Logo = {
  alt: string;
  src: string;
};

export type HeroProps = {
  title: string;
  subtitle: string;
  primaryCta: CtaConfig;
  secondaryCta: CtaConfig;
  logos: Logo[];
};

export function Hero({ title, subtitle, primaryCta, secondaryCta, logos }: HeroProps): JSX.Element {
  return (
    <div className={styles.hero}>
      <span className={styles.backgroundGlow} aria-hidden="true" />
      <div className={styles.copy}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <CtaButtons primary={primaryCta} secondary={secondaryCta} align="center" />
      {logos.length ? (
        <div>
          <p className={styles.trustCopy}>Trusted by forward-thinking data teams</p>
          <LogoRow logos={logos} />
        </div>
      ) : null}
    </div>
  );
}
