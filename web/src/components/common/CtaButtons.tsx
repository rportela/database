import { trackCtaClick } from "../../utils/analytics";
import styles from "./CtaButtons.module.css";

type CtaConfig = {
  label: string;
  href: string;
  trackingId?: string;
};

type Align = "left" | "center" | "right";

export type CtaButtonsProps = {
  primary: CtaConfig;
  secondary?: CtaConfig;
  align?: Align;
};

const alignClassName: Record<Align, string> = {
  left: styles.alignLeft,
  center: styles.alignCenter,
  right: styles.alignRight,
};

function emitCtaEvent(cta: CtaConfig, variant: "primary" | "secondary") {
  if (!cta.trackingId) {
    return;
  }

  trackCtaClick({
    trackingId: cta.trackingId,
    href: cta.href,
    label: cta.label,
    variant,
    location: "home",
  });
}

export function CtaButtons({ primary, secondary, align = "left" }: CtaButtonsProps): JSX.Element {
  const containerClassName = `${styles.container} ${alignClassName[align]}`;

  const handleClick = (cta: CtaConfig, variant: "primary" | "secondary") => () => {
    emitCtaEvent(cta, variant);
  };

  return (
    <div className={containerClassName}>
      <a
        className={`${styles.link} ${styles.primary}`}
        href={primary.href}
        onClick={handleClick(primary, "primary")}
        data-tracking-id={primary.trackingId}
      >
        {primary.label}
      </a>
      {secondary ? (
        <a
          className={`${styles.link} ${styles.secondary}`}
          href={secondary.href}
          onClick={handleClick(secondary, "secondary")}
          data-tracking-id={secondary.trackingId}
        >
          {secondary.label}
        </a>
      ) : null}
    </div>
  );
}
