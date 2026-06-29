import { useEffect } from "react";
import { useFloatingTimerStore } from "../store/floatingTimerStore";

export function useTimerSync() {
  const { status, syncFromServer } = useFloatingTimerStore();

  useEffect(() => {
    syncFromServer();
  }, []);

  useEffect(() => {
    if (status !== "RUNNING") return;
    const id = setInterval(syncFromServer, 10_000);
    return () => clearInterval(id);
  }, [status, syncFromServer]);

  useEffect(() => {
    const onFocus = () => syncFromServer();
    const onVisible = () => { if (!document.hidden) syncFromServer(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncFromServer]);
}
