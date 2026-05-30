/** Consistent label for form fields, shows a red asterisk when required. */
export default function FormLabel({
  children,
  required,
  htmlFor,
  style,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase" as const,
        color: "var(--on-mut)",
        marginBottom: 6,
        fontFamily: "'JetBrains Mono', monospace",
        ...style,
      }}
    >
      {children}
      {required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
    </label>
  );
}
