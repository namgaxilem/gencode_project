import ThemeProvider from "./ThemeProvider";

export default function RootContext({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
