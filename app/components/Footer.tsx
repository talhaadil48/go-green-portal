export default function Footer() {
  return (
    <footer className="bg-green-700 text-white mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h4 className="text-lg font-semibold mb-2">GoGreenHire</h4>
          <p className="text-green-200 text-sm">
            LITTLE BURTON EAST, Burton-on-Trent, Staffordshire, DE14 1PS
          </p>
          <p className="text-green-200 text-sm mt-1">
            Website:{" "}
            <a
              href="https://www.gogreenhire.co.uk"
              className="underline hover:text-green-300"
            >
              www.gogreenhire.co.uk
            </a>
          </p>
        </div>
        <div className="flex space-x-4">
          <a href="#" className="hover:text-green-300 transition">
            Facebook
          </a>
          <a href="#" className="hover:text-green-300 transition">
            Twitter
          </a>
          <a href="#" className="hover:text-green-300 transition">
            Instagram
          </a>
        </div>
      </div>
      <div className="bg-green-800 text-green-200 text-center py-3 text-sm">
        © {new Date().getFullYear()} GoGreenHire. All rights reserved.
      </div>
    </footer>
  );
}
