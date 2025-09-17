import { useId } from "react";

import { Badge } from "../common/Badge";
import { LogoRow } from "../common/LogoRow";
import styles from "./SocialProof.module.css";

type Testimonial = {
  quote: string;
  author: string;
  role: string;
  logo?: string;
};

type BadgeConfig = {
  label: string;
  iconSrc?: string;
};

type Logo = {
  alt: string;
  src: string;
};

type SocialProofProps = {
  headline: string;
  logos: Logo[];
  testimonial: Testimonial;
  badges: BadgeConfig[];
};

export function SocialProof({ headline, logos, testimonial, badges }: SocialProofProps): JSX.Element {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.headline}>
        {headline}
      </h2>
      <LogoRow logos={logos} />
      <figure className={styles.testimonialCard}>
        <blockquote className={styles.quote}>
          “{testimonial.quote}”
        </blockquote>
        <figcaption className={styles.author}>
          <strong>{testimonial.author}</strong>
          <span>{testimonial.role}</span>
          {testimonial.logo ? (
            <img src={testimonial.logo} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          ) : null}
        </figcaption>
      </figure>
      <div className={styles.badges}>
        {badges.map((badge) => (
          <Badge key={badge.label} label={badge.label} iconSrc={badge.iconSrc} />
        ))}
      </div>
    </section>
  );
}
