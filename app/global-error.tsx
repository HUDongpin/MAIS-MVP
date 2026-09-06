"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const pageStyle = {
  alignItems: "center",
  background: "#f8fafc",
  color: "#0f172a",
  display: "flex",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  justifyContent: "center",
  margin: 0,
  minHeight: "100vh",
  padding: "24px"
} as const;

const panelStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
  maxWidth: "640px",
  padding: "32px",
  textAlign: "center"
} as const;

const buttonStyle = {
  background: "#0f172a",
  border: 0,
  borderRadius: "999px",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 800,
  marginTop: "24px",
  padding: "12px 20px"
} as const;

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body style={pageStyle}>
        <main aria-live="assertive" role="alert" style={panelStyle}>
          <p style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "0.16em", margin: 0 }}>MAIS</p>
          <h1 lang="en" style={{ fontSize: "30px", margin: "16px 0 0" }}>
            MAIS is temporarily unavailable
          </h1>
          <p lang="zh-Hant" style={{ fontSize: "17px", fontWeight: 700, margin: "16px 0 0" }}>
            MAIS 暫時未能載入
          </p>
          <p lang="zh-Hans" style={{ fontSize: "17px", fontWeight: 700, margin: "6px 0 0" }}>
            MAIS 暂时无法加载
          </p>
          <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.7, margin: "18px 0 0" }}>
            No diagnostic or account details are shown here. / 此處不會顯示診斷或帳戶資料。 / 此处不会显示诊断或账户数据。
          </p>
          <button onClick={reset} style={buttonStyle} type="button">
            Try again / 再試一次 / 重试
          </button>
        </main>
      </body>
    </html>
  );
}
