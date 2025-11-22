import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 via-black to-black">
      <main className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h1 className="text-6xl font-bold text-white mb-6">
          Premium Music Streaming
        </h1>
        <p className="text-xl text-gray-300 mb-12 max-w-2xl">
          Unlimited music, podcasts, and audiobooks. Pay with crypto and enjoy your favorite content.
        </p>
        <Link
          href="/checkout"
          className="bg-green-500 hover:bg-green-600 text-black font-bold py-4 px-12 rounded-full text-lg transition-all transform hover:scale-105"
        >
          Get Premium
        </Link>
      </main>
    </div>
  );
}
