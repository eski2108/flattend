import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#E2E8F0',
          backdropFilter: 'blur(10px)',
        },
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-100 group-[.toaster]:border-slate-700 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-slate-400",
          actionButton:
            "group-[.toast]:bg-cyan-500 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-slate-700 group-[.toast]:text-slate-300",
          error: "group-[.toaster]:bg-slate-900 group-[.toaster]:text-red-400 group-[.toaster]:border-red-500/30",
          success: "group-[.toaster]:bg-slate-900 group-[.toaster]:text-emerald-400 group-[.toaster]:border-emerald-500/30",
          warning: "group-[.toaster]:bg-slate-900 group-[.toaster]:text-amber-400 group-[.toaster]:border-amber-500/30",
          info: "group-[.toaster]:bg-slate-900 group-[.toaster]:text-cyan-400 group-[.toaster]:border-cyan-500/30",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
