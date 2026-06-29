"use client";

import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ModalContext = createContext(null);

let mountedShowModal = null;
const pendingModals = [];

const modalTypeConfig = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    ringClass: "shadow-[0_0_0_6px_rgba(16,185,129,0.08)]",
    actionClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  error: {
    icon: XCircle,
    iconClass: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    ringClass: "shadow-[0_0_0_6px_rgba(244,63,94,0.08)]",
    actionClass: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    ringClass: "shadow-[0_0_0_6px_rgba(245,158,11,0.08)]",
    actionClass: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  info: {
    icon: Info,
    iconClass: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    ringClass: "shadow-[0_0_0_6px_rgba(14,165,233,0.08)]",
    actionClass: "bg-sky-600 hover:bg-sky-700 text-white",
  },
  confirm: {
    icon: HelpCircle,
    iconClass: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    ringClass: "shadow-[0_0_0_6px_rgba(14,165,233,0.08)]",
    actionClass: "bg-brand-neonblue hover:bg-brand-neonblue/90 text-white",
  },
};

const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] transition-all disabled:cursor-wait disabled:opacity-60";

const getActionClass = (variant, type) => {
  if (variant === "secondary") {
    return "border border-border bg-brand-surface text-main hover:bg-brand-bgbase";
  }
  if (variant === "danger") {
    return "bg-rose-600 hover:bg-rose-700 text-white";
  }
  if (variant === "warning") {
    return "bg-amber-500 hover:bg-amber-600 text-white";
  }
  return modalTypeConfig[type]?.actionClass || modalTypeConfig.info.actionClass;
};

const normalizeActions = (modal) => {
  if (modal.hideDefaultActions) return [];
  if (Array.isArray(modal.actions) && modal.actions.length > 0) {
    return modal.actions;
  }
  if (modal.type === "confirm") {
    return [
      {
        label: modal.cancelLabel || "Cancel",
        value: false,
        variant: "secondary",
      },
      {
        label: modal.confirmLabel || "Confirm",
        value: true,
        variant: modal.danger ? "danger" : "primary",
      },
    ];
  }
  return [
    {
      label: modal.confirmLabel || "Done",
      value: true,
      variant: "primary",
    },
  ];
};

const normalizeModalArgs = (...args) => {
  if (typeof args[0] === "object" && args[0] !== null) {
    return {
      type: "info",
      title: "Notice",
      message: "",
      ...args[0],
    };
  }

  return {
    type: args[0] || "info",
    title: args[1] || "Notice",
    message: args[2] || "",
    actions: args[3],
  };
};

const enqueueOrShow = (config) =>
  new Promise((resolve) => {
    const open = mountedShowModal;
    if (open) {
      open(config).then(resolve);
      return;
    }
    pendingModals.push({ config, resolve });
  });

export const showModal = (...args) => enqueueOrShow(normalizeModalArgs(...args));

export const showSuccess = (title, message = "", options = {}) => {
  if (typeof message === "object" && message !== null) {
    options = message;
    message = "";
  }
  return showModal({ type: "success", title, message, ...options });
};

export const showError = (title, message = "", options = {}) => {
  if (typeof message === "object" && message !== null) {
    options = message;
    message = "";
  }
  return showModal({ type: "error", title, message, ...options });
};

export const showWarning = (title, message = "", options = {}) => {
  if (typeof message === "object" && message !== null) {
    options = message;
    message = "";
  }
  return showModal({ type: "warning", title, message, ...options });
};

export const showInfo = (title, message = "", options = {}) => {
  if (typeof message === "object" && message !== null) {
    options = message;
    message = "";
  }
  return showModal({ type: "info", title, message, ...options });
};

export const showConfirm = (title, message = "", options = {}) => {
  if (typeof message === "object" && message !== null) {
    options = message;
    message = "";
  }
  return showModal({
    type: "confirm",
    title,
    message,
    closeOnOverlay: false,
    closeOnEscape: true,
    ...options,
  }).then(Boolean);
};

function ModalHost({ modal, onClose }) {
  const [busyAction, setBusyAction] = useState(null);
  const dialogRef = useRef(null);
  const type = modal?.type || "info";
  const config = modalTypeConfig[type] || modalTypeConfig.info;
  const actions = normalizeActions(modal);
  const Icon = modal?.icon || config.icon;

  useEffect(() => {
    if (!modal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape" && modal.closeOnEscape !== false) {
        onClose(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => {
      const firstButton = dialogRef.current?.querySelector("button");
      firstButton?.focus();
    }, 80);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modal, onClose]);

  const handleAction = async (action) => {
    if (!action || busyAction) return;
    setBusyAction(action.label);
    try {
      const result = action.onClick
        ? await action.onClick({ close: onClose, modal })
        : undefined;
      if (result === false || action.autoClose === false) return;
      onClose(action.value ?? result ?? true);
    } finally {
      setBusyAction(null);
    }
  };

  const renderedContent =
    typeof modal.content === "function"
      ? modal.content({ close: onClose, modal })
      : modal.content;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && modal.closeOnOverlay !== false) {
          onClose(false);
        }
      }}
    >
      <motion.section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-modal-title"
        aria-describedby={modal.message ? "global-modal-message" : undefined}
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-brand-surface text-main shadow-2xl outline-none"
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {modal.dismissible !== false && (
          <button
            type="button"
            onClick={() => onClose(false)}
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-bgbase hover:text-main focus:outline-none focus:ring-2 focus:ring-brand-neonblue/40"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        )}

        <div className="px-6 pb-5 pt-7 sm:px-7">
          <div
            className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border ${config.iconClass} ${config.ringClass}`}
          >
            {createElement(Icon, { size: 24, strokeWidth: 2.2 })}
          </div>

          <div className="pr-10">
            <h2
              id="global-modal-title"
              className="font-rajdhani text-2xl font-black uppercase leading-tight tracking-[0.04em] text-main"
            >
              {modal.title}
            </h2>
            {modal.message && (
              <p
                id="global-modal-message"
                className="mt-2 text-sm font-medium leading-6 text-muted"
              >
                {modal.message}
              </p>
            )}
          </div>

          {renderedContent && <div className="mt-5">{renderedContent}</div>}
        </div>

        {actions.length > 0 && (
          <div className="flex flex-col-reverse gap-3 border-t border-border bg-brand-bgbase/35 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
            {actions.map((action) => {
              const ActionIcon = action.icon;
              const isBusy = busyAction === action.label;
              return (
                <button
                  key={action.label}
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => handleAction(action)}
                  className={`${buttonBaseClass} ${getActionClass(action.variant, type)}`}
                >
                  {isBusy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : ActionIcon ? (
                    createElement(ActionIcon, { size: 15 })
                  ) : null}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);
  const resolverRef = useRef(null);

  const closeModal = useCallback((result = false) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setModal(null);
  }, []);

  const openModal = useCallback(
    (config) =>
      new Promise((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setModal({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          closeOnOverlay: true,
          closeOnEscape: true,
          dismissible: true,
          ...config,
        });
      }),
    []
  );

  useEffect(() => {
    mountedShowModal = openModal;
    while (pendingModals.length > 0) {
      const pending = pendingModals.shift();
      openModal(pending.config).then(pending.resolve);
    }
    return () => {
      if (mountedShowModal === openModal) mountedShowModal = null;
    };
  }, [openModal]);

  const value = useMemo(
    () => ({
      showModal: (...args) => openModal(normalizeModalArgs(...args)),
      showSuccess,
      showError,
      showWarning,
      showInfo,
      showConfirm,
      closeModal,
    }),
    [closeModal, openModal]
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {modal && <ModalHost key={modal.id} modal={modal} onClose={closeModal} />}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
}
