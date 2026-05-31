import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        style: {
          background: "#111111",
          color: "#fff",
          border: "2px solid #e63946",
          padding: "16px 24px",
          fontSize: "14px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          borderRadius: "0px",
          boxShadow: "0 4px 12px rgba(230, 57, 70, 0.4)",
        },
        classNames: {
          toast: "group toast",
          description: "text-white",
          actionButton: "bg-e63946 text-white font-bold",
          cancelButton: "bg-white text-black",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
