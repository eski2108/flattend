import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: '#0f172a',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          color: '#e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        },
        classNames: {
          toast: "group toast",
          description: "text-slate-400",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
