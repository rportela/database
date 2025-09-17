import styles from "./Badge.module.css";

type BadgeProps = {
  label: string;
  iconSrc?: string;
};

export function Badge({ label, iconSrc }: BadgeProps): JSX.Element {
  return (
    <span className={styles.badge}>
      {iconSrc ? <img src={iconSrc} alt="" aria-hidden="true" loading="lazy" decoding="async" /> : null}
      {label}
    </span>
  );
}
