'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useContext } from 'react'
import Link from 'next/link'
import { useWallet } from '../contexts/WalletContext'
import { useRouter } from 'next/navigation';

export default function About() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [showConnectingAnimation, setShowConnectingAnimation] = useState(false);
  const { connectWallet, address, connecting } = useWallet();
  const router = useRouter();
  
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

  const features = [
    {
      icon: "🔒",
      title: "Privacy First",
      description: "Your conversations remain private with end-to-end encryption and optional ephemeral messaging."
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      description: "Real-time messaging with ultra-low latency for seamless communication experiences."
    },
    {
      icon: "🎨",
      title: "Customizable",
      description: "Personalize your experience with themes, layouts, and notification preferences."
    },
    {
      icon: "🌐",
      title: "Cross-Platform",
      description: "Access Oblivion from any device - desktop, mobile, or web - with perfect synchronization."
    }
  ]

  const stats = [
    { number: "10M+", label: "Active Users" },
    { number: "99.9%", label: "Uptime" },
    { number: "256-bit", label: "Encryption" },
    { number: "24/7", label: "Support" }
  ]

  // Handle wallet connection with animation (same as landing page)
  const handleWalletConnect = async () => {
    await connectWallet();
    if (address) {
      setShowConnectingAnimation(true);
      setTimeout(() => {
        router.push('/home');
      }, 2000);
    }
  };

  // Watch for address changes to trigger animation
  useEffect(() => {
    if (address && !showConnectingAnimation) {
      setShowConnectingAnimation(true);
      setTimeout(() => {
        router.push('/home');
      }, 2000);
    }
  }, [address]);

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
              Oblivion: Hybrid, Censorship-Resistant Social Media
            </motion.h1>
            <motion.p 
              className="text-xl sm:text-2xl text-white/70 leading-relaxed max-w-4xl mx-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Oblivion is a next-generation social media platform that merges Web2 and Web3 technologies, offering true censorship resistance and user control. Enjoy a familiar social experience or make your posts permanent on the Stellar blockchain—the choice is yours.
            </motion.p>
          </motion.div>

          {/* Features Section */}
          <motion.div 
            className="grid md:grid-cols-2 gap-8 mb-16"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <motion.div
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-500"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-2xl font-bold text-white mb-4">Hybrid Model</h3>
              <p className="text-white/70 leading-relaxed">Oblivion lets you post in the traditional (Web2) way or make your content permanent and censorship-resistant on the Stellar blockchain. Choose flexibility or permanence for every post.</p>
            </motion.div>
            <motion.div
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-500"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.4 }}
            >
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-2xl font-bold text-white mb-4">Censorship Resistance</h3>
              <p className="text-white/70 leading-relaxed">Posts on the blockchain are permanent and cannot be removed by any authority. Your ideas and voice are protected—forever.</p>
            </motion.div>
            <motion.div
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-500"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.6 }}
            >
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-4">Campaigns & Communities</h3>
              <p className="text-white/70 leading-relaxed">Oblivion is more than just posting—start campaigns, build communities, and gather support. Social media is now about collective action and real impact.</p>
            </motion.div>
            <motion.div
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-500"
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-2xl font-bold text-white mb-4">Vision for the Future</h3>
              <p className="text-white/70 leading-relaxed">Coming soon: DMs, Telegram-style channels, subscriptions, and new revenue models for creators. Build your own community, share freely, and get rewarded.</p>
            </motion.div>
          </motion.div>

          {/* Mission Section */}
          <motion.div 
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-white/20 text-center"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 2.2 }}
            whileHover={{ scale: 1.01 }}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 2.4 }}
            >
              Our Mission
            </motion.h2>
            <motion.p 
              className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-4xl mx-auto mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 2.6 }}
            >
              We are here to defend freedom of expression and uncensored communication in the digital world. Oblivion introduces a new era in social media with a hybrid model that gives users both flexibility and permanence. The fate of your posts is in your hands: temporary or forever.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 2.8 }}
            >
              <Link href="/">
                <motion.button 
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-3 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-blue-500/25"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}