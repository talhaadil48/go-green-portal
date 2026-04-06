import Link from "next/link";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-green-950 via-emerald-950 to-black text-green-100 border-t border-green-800/30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Brand - Left side */}
        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          GO<span className="text-green-400">GREEN</span>
        </h3>

        {/* Socials - Right side */}
        <div className="flex items-center gap-6">
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-300 hover:text-green-100 hover:scale-110 transition-all duration-300"
            aria-label="Facebook"
          >
            <Facebook size={24} strokeWidth={1.8} />
          </a>

          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-300 hover:text-green-100 hover:scale-110 transition-all duration-300"
            aria-label="X (Twitter)"
          >
            <Twitter size={24} strokeWidth={1.8} />
          </a>

          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-300 hover:text-green-100 hover:scale-110 transition-all duration-300"
            aria-label="Instagram"
          >
            <Instagram size={24} strokeWidth={1.8} />
          </a>

          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-300 hover:text-green-100 hover:scale-110 transition-all duration-300"
            aria-label="LinkedIn"
          >
            <Linkedin size={24} strokeWidth={1.8} />
          </a>
        </div>
        
      </div>
    </footer>
  );
}