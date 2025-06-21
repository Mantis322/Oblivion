'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWallet } from '../contexts/WalletContext'
import { useRouter } from 'next/navigation'

export default function About() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [showConnectingAnimation, setShowConnectingAnimation] = useState(false)
  const { connectWallet, address, connecting } = useWallet()
  const router = useRouter()
  
  // Fixed positions for particles
  const particlePositions = [
    { left: 10, top: 15 },
    { left: 90, top: 25 },
    { left: 20, top: 80 },
    { left: 80, top: 10 },
    { left: 50, top: 90 },
    { left: 95, top: 70 },
    { left: 5, top: 50 },
    { left: 70, top: 30 },
    { left: 25, top: 95 },
    { left: 85, top: 85 },
  ]
  
  useEffect(() => {
    setMounted(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Handle wallet connection with animation
  const handleWalletConnect = async () => {
    await connectWallet()
    if (address) {
      setShowConnectingAnimation(true)
      setTimeout(() => {
        router.push('/home')
      }, 2000)
    }
  }

  // Watch for address changes to trigger animation
  useEffect(() => {
    if (address && !showConnectingAnimation) {
      setShowConnectingAnimation(true)
      setTimeout(() => {
        router.push('/home')
      }, 2000)
    }
  }, [address, showConnectingAnimation, router])

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* Loading Animation Overlay */}
      {showConnectingAnimation && (
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="text-center">
            <motion.div
              className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full mx-auto mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <motion.h2
              className="text-2xl sm:text-3xl font-bold text-white mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Connecting to Oblivion
            </motion.h2>
            <motion.p
              className="text-white/70 text-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Welcome to the decentralized future
            </motion.p>
          </div>
        </motion.div>
      )}

      {/* Dynamic Mouse-Following Gradient */}
      <motion.div
        className="fixed inset-0 opacity-30 pointer-events-none z-0"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.1), transparent 50%)`
        }}
      />
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Large Floating Orbs */}
        <motion.div
          className="absolute w-96 h-96 rounded-full"
          style={{
            background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1))',
            filter: 'blur(40px)',
            top: '5%',
            right: '5%'
          }}
          animate={{
            x: [-30, 30, -30],
            y: [-15, 15, -15],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute w-80 h-80 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))',
            filter: 'blur(35px)',
            bottom: '10%',
            left: '0%'
          }}
          animate={{
            x: [-20, 20, -20],
            y: [-10, 10, -10],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Floating Particles */}
        {mounted && particlePositions.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400/40 rounded-full"
            animate={{
              y: [-15, -45, -15],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + (i % 2),
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut"
            }}
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
            }}
          />
        ))}
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-8 py-6 bg-transparent backdrop-blur-md border-b border-white/10 z-50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Link href="/">
          <motion.div 
            className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent cursor-pointer"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            OBLIVION
          </motion.div>
        </Link>
        <div className="flex items-center space-x-4 sm:space-x-10">
          {[
            { name: 'Home', href: '/' },
            { name: 'About', href: '/about' }
          ].map((item, index) => (
            <motion.div key={item.name}>
              <Link
                href={item.href}
                className={`text-white/80 hover:text-white transition-all duration-300 relative group text-sm sm:text-base ${
                  item.name === 'About' ? 'text-white' : ''
                }`}
              >
                <motion.span
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  whileHover={{ y: -2 }}
                  className="block"
                >
                  {item.name}
                </motion.span>
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 ${
                  item.name === 'About' ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </Link>
            </motion.div>
          ))}
          <motion.button 
            className="px-4 sm:px-6 py-2 sm:py-3 border border-white/20 rounded-full text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleWalletConnect}
            disabled={connecting || showConnectingAnimation}
          >
            {connecting || showConnectingAnimation ? 'Connecting...' : 'Log in'}
          </motion.button>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="relative z-10 pt-32 pb-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-16"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent leading-tight mb-6"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              The Future of Social Media
            </motion.h1>
            <motion.p 
              className="text-xl sm:text-2xl text-white/70 leading-relaxed max-w-4xl mx-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Experience the next evolution of social networking with hybrid Web2/Web3 technology, 
              O.B.I. business intelligence, and community-driven campaigns.
            </motion.p>
          </motion.div>

          {/* Core Features */}
          <motion.div 
            className="grid md:grid-cols-3 gap-8 mb-16"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.div
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-4">Hybrid Social Network</h3>
              <p className="text-white/70 leading-relaxed">
                Choose between traditional Web2 posting or permanent Web3 blockchain storage. 
                Your content, your choice - temporary or forever.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.0 }}
            >
              <div className="text-4xl mb-4">�</div>
              <h3 className="text-2xl font-bold text-white mb-4">O.B.I. Platform</h3>
              <p className="text-white/70 leading-relaxed">
                Oblivion Business Intelligence - Create ventures, manage repositories, 
                build learning paths, and monetize your knowledge with our comprehensive platform.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-4">Community Campaigns</h3>
              <p className="text-white/70 leading-relaxed">
                Launch fundraising campaigns, build communities around causes, 
                and create real-world impact through decentralized coordination.
              </p>
            </motion.div>
          </motion.div>

          {/* Detailed Features */}
          <motion.div 
            className="grid md:grid-cols-2 gap-8 mb-16"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
          >
            <motion.div
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
              whileHover={{ scale: 1.01 }}
            >
              <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="mr-3">🌐</span>
                Decentralized & Censorship-Resistant
              </h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Posts stored on the Stellar blockchain become permanent and immutable. 
                No authority can remove or censor your ideas once they&apos;re on-chain.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
              whileHover={{ scale: 1.01 }}
            >
              <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="mr-3">📚</span>
                Educational Ventures
              </h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Create educational content, organize it into learning paths, 
                and monetize your expertise through our venture system.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
              whileHover={{ scale: 1.01 }}
            >
              <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="mr-3">💰</span>
                Monetization & Crowdfunding
              </h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Launch campaigns to fund projects, sell educational content, 
                and build sustainable revenue streams in the creator economy.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
              whileHover={{ scale: 1.01 }}
            >
              <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="mr-3">🔗</span>
                Stellar Network Integration
              </h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Built on Stellar for fast, low-cost transactions and seamless 
                integration with the broader cryptocurrency ecosystem.
              </p>
            </motion.div>
          </motion.div>

          {/* Mission Statement */}
          <motion.div 
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-white/20 text-center mb-16"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.8 }}
            whileHover={{ scale: 1.01 }}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 2.0 }}
            >
              Our Vision
            </motion.h2>
            <motion.p 
              className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-4xl mx-auto mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 2.2 }}
            >
              Oblivion bridges the gap between traditional social media and the decentralized web. 
              We empower creators, educators, and communities to build, share, and monetize their 
              content while maintaining full control over their digital presence.
            </motion.p>
            <motion.div
              className="flex justify-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 2.4 }}
            >
              <Link href="/">
                <motion.button 
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-3 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-blue-500/25"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Start Your Journey
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}