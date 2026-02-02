import Link from "next/link";
import {
  Facebook,
  Twitter,        // we'll use this for old Twitter feel or rename
  Instagram,
  Linkedin
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-green-950 via-emerald-950 to-black text-green-100 border-t border-green-800/30">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {/* Brand + Contact */}
          <div className="space-y-5">
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              GO<span className="text-green-400">GREEN</span>
            </h3>
            <p className="text-green-300/90 text-sm leading-relaxed">
              Protecting your income.<br />Never missing a lesson.
            </p>
            <div className="text-sm text-green-200/90 space-y-2">
              <p>Derby Turn, Building 1, Derby Road </p>
              <p>BURTON UPON TRENT Staffordshire DE141RX</p>



              <p>
                Website:{" "}
                <a
                  href="https://www.gogreenhire.co.uk"
                  className="text-green-400 hover:text-green-300 underline underline-offset-4 transition-colors"
                >
                  www.gogreenhire.co.uk
                </a>
              </p>
              <p className="mt-4">
                Call us: <span className="text-white font-medium">01283 247 247</span>
              </p>
            </div>
          </div>

          {/* Social + Newsletter placeholder */}
          <div className="space-y-5">
            <h4 className="text-lg font-semibold text-white">Connect</h4>
            <div className="flex items-center gap-6">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 hover:text-green-100 hover:scale-110 transition-all duration-300"
                aria-label="Facebook"
              >
                <Facebook size={28} strokeWidth={1.8} />
              </a>

              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 hover:text-green-100 hover:scale-110 transition-all duration-300"
                aria-label="X (Twitter)"
              >
                {/* Using Twitter icon as many still recognize it as Twitter/X */}
                <Twitter size={28} strokeWidth={1.8} />
                {/* If you prefer a more "X"-like look, you can use a custom X icon later */}
              </a>

              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 hover:text-green-100 hover:scale-110 transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram size={28} strokeWidth={1.8} />
              </a>

              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 hover:text-green-100 hover:scale-110 transition-all duration-300"
                aria-label="LinkedIn"
              >
                <Linkedin size={28} strokeWidth={1.8} />
              </a>
            </div>

            {/* Optional tiny newsletter input - uncomment if wanted */}
            {/* <div className="mt-6">
              <p className="text-sm text-green-300 mb-2">Stay updated</p>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="flex-1 bg-black/40 border border-green-700/50 rounded-l-xl px-4 py-2 text-sm text-white placeholder-green-500/60 focus:outline-none focus:border-green-400"
                />
                <button className="bg-green-600 hover:bg-green-500 px-5 rounded-r-xl text-sm font-medium transition-colors">
                  Join
                </button>
              </div>
            </div> */}
          </div>
        </div>

        {/* Bottom bar */}

      </div>
    </footer>
  );
}