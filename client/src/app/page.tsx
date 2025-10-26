import Link from 'next/link'
import { ArrowRight, BarChart3, FileCheck, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <nav className="flex justify-between items-center mb-20">
          <div className="text-2xl font-bold text-white">
            UPC Resolver
          </div>
          <Link
            href="/login"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Sign In
          </Link>
        </nav>

        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-white mb-6">
            Enterprise UPC Conflict Resolution
          </h1>
          <p className="text-xl text-slate-300 mb-12">
            Detect, analyze, and resolve UPC conflicts across your entire inventory with AI-powered precision
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition"
            >
              View Demo
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-32">
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-8">
            <FileCheck className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              File Processing
            </h3>
            <p className="text-slate-400">
              Upload and process large CSV/Excel files with intelligent conflict detection
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-8">
            <BarChart3 className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Analytics Dashboard
            </h3>
            <p className="text-slate-400">
              Real-time insights and visualizations for conflict trends and resolution rates
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-8">
            <Zap className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              AI-Powered
            </h3>
            <p className="text-slate-400">
              Machine learning algorithms automatically suggest optimal conflict resolutions
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 border-t border-slate-800">
        <div className="text-center text-slate-500">
          © 2025 UPC Resolver V2. Built with Next.js 14 + Express + PostgreSQL
        </div>
      </div>
    </div>
  );
}
