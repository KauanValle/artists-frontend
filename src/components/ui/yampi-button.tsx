
import { useEffect } from "react";

export default function YampiBuyButton() {
  useEffect(() => {
    const script = document.createElement("script");

    script.src =
      "https://api.yampi.io/v2/artistas/public/buy-button/94R9Q3F1TX/js";

    script.async = true;
    script.className = "ymp-script";

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return <div id="yampi-buy-button"></div>;
}
