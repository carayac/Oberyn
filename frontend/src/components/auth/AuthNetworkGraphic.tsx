import { useEffect, useRef } from "react";

type ParticlesWindow = Window & {
  particlesJS?: (id: string, config: Record<string, unknown>) => void;
  pJSDom?: unknown[] | null;
};

const particlesConfig = {
  particles: {
    number: {
      value: 42,
      density: {
        enable: true,
        value_area: 680,
      },
    },
    color: {
      value: ["#00951d", "#aeb6c1"],
    },
    shape: {
      type: "circle",
      stroke: {
        width: 0,
        color: "#000000",
      },
    },
    opacity: {
      value: 0.95,
      random: false,
    },
    size: {
      value: 5,
      random: true,
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#cfd6df",
      opacity: 0.8,
      width: 1,
    },
    move: {
      enable: true,
      speed: 0.8,
      direction: "top",
      random: true,
      straight: false,
      out_mode: "out",
      bounce: false,
    },
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: {
        enable: false,
      },
      onclick: {
        enable: false,
      },
      resize: true,
    },
  },
  retina_detect: true,
};

export function AuthNetworkGraphic() {
  const idRef = useRef(`auth-particles-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const particlesWindow = window as ParticlesWindow;
    let isMounted = true;

    function loadParticlesScript() {
      return new Promise<void>((resolve, reject) => {
        if (particlesWindow.particlesJS) {
          resolve();
          return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>('script[data-auth-particles="true"]');
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), { once: true });
          existingScript.addEventListener("error", () => reject(new Error("particles.js failed to load")), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = "/vendor/particles.js";
        script.async = true;
        script.dataset.authParticles = "true";
        script.addEventListener("load", () => resolve(), { once: true });
        script.addEventListener("error", () => reject(new Error("particles.js failed to load")), { once: true });
        document.body.appendChild(script);
      });
    }

    async function mountParticles() {
      await loadParticlesScript();

      if (!isMounted) return;

      const container = document.getElementById(idRef.current);
      if (!container || !particlesWindow.particlesJS) return;

      container.replaceChildren();
      particlesWindow.pJSDom = [];
      particlesWindow.particlesJS(idRef.current, particlesConfig);
    }

    void mountParticles();

    return () => {
      isMounted = false;
      document.getElementById(idRef.current)?.replaceChildren();
      particlesWindow.pJSDom = [];
    };
  }, []);

  return (
    <div
      id={idRef.current}
      className="pointer-events-none absolute -left-40 top-[23%] hidden h-[680px] w-[430px] overflow-hidden opacity-100 lg:block"
      aria-hidden="true"
    />
  );
}
