'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWallet } from './contexts/WalletContext'
import PasskeyLoginModal from './components/PasskeyLoginModal'

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [showConnectingAnimation, setShowConnectingAnimation] = useState(false)
  const [showPasskeyModal, setShowPasskeyModal] = useState(false)
  const { connectWallet, address, connecting, isPasskeySupported } = useWallet()
  const router = useRouter()
  
  // Fixed positions for particles to avoid hydration mismatch
  const particlePositions = [
    { left: 15, top: 20 },
    { left: 85, top: 30 },
    { left: 25, top: 70 },
    { left: 75, top: 15 },
    { left: 45, top: 85 },
    { left: 90, top: 60 },
    { left: 10, top: 45 },
    { left: 60, top: 25 },
    { left: 30, top: 90 },
    { left: 80, top: 75 },
    { left: 20, top: 55 },
    { left: 65, top: 40 }
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
    
    // Show connecting animation when address is set
    if (address) {
      setShowConnectingAnimation(true)
      
      // Redirect after 2 seconds
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
  }, [address, router, showConnectingAnimation])

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Connecting Animation Overlay */}
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
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.1), transparent 50%)`
        }}
      />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Large Floating Orbs */}
        <motion.div
          className="absolute w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1))',
            filter: 'blur(40px)',
            top: '10%',
            right: '10%'
          }}
          animate={{
            x: [-50, 50, -50],
            y: [-25, 25, -25],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))',
            filter: 'blur(35px)',
            bottom: '20%',
            left: '5%'
          }}
          animate={{
            x: [-25, 25, -25],
            y: [-15, 15, -15],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(225deg, rgba(244, 63, 94, 0.1), rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))',
            filter: 'blur(30px)',
            top: '50%',
            left: '45%'
          }}
          animate={{
            x: [-40, 40, -40],
            y: [-30, 30, -30],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Floating Particles */}
        {mounted && particlePositions.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400/40 rounded-full pointer-events-none"
            animate={{
              y: [-20, -60, -20],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 4 + (i % 3),
              repeat: Infinity,
              delay: i * 0.3,
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
          className="absolute inset-0 opacity-10 pointer-events-none"
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
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-8 py-6 bg-transparent backdrop-blur-md border-b border-white/10 z-50 pointer-events-auto"
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
            <Link key={item.name} href={item.href}>
              <motion.div
                className={`text-white/80 hover:text-white transition-all duration-300 relative group text-sm sm:text-base cursor-pointer ${
                  item.name === 'Home' ? 'text-white' : ''
                }`}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                whileHover={{ y: -2 }}
              >
                {item.name}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 ${
                  item.name === 'Home' ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </motion.div>
            </Link>
          ))}
          <motion.button 
            onClick={handleWalletConnect}
            disabled={connecting}
            className="px-4 sm:px-6 py-2 sm:py-3 border border-white/20 rounded-full text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm transition-all duration-300 text-sm sm:text-base cursor-pointer disabled:opacity-50"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            {connecting ? "Connecting..." : "Log in"}
          </motion.button>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-8 z-10">
        <div className="max-w-7xl w-full flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left Content */}
          <motion.div 
            className="flex-1 max-w-2xl text-center lg:text-left"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.h1 
              className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent leading-tight mb-6 sm:mb-8"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              Freedom to speak <br />
              with Oblivion
            </motion.h1>
            <motion.p 
              className="text-lg sm:text-xl lg:text-2xl text-white/70 mb-8 sm:mb-10 leading-relaxed"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Connect, share, and choose your own way <br />
              — ephemeral or eternal. <br />
            </motion.p>
            <motion.button 
              onClick={handleWalletConnect}
              disabled={connecting}
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white text-lg sm:text-xl lg:text-2xl font-semibold px-8 sm:px-12 py-4 sm:py-5 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1 backdrop-blur-sm border border-white/10 disabled:opacity-50"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              {connecting ? "Connecting..." : "Connect Stellar Wallet"}
            </motion.button>
            
            {/* Passkey Option */}
            {isPasskeySupported && (
              <motion.div
                className="mt-6 text-center"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="h-px bg-white/20 flex-1"></div>
                  <span className="text-white/60 text-sm">or</span>
                  <div className="h-px bg-white/20 flex-1"></div>
                </div>
                <motion.button
                  onClick={() => setShowPasskeyModal(true)}
                  className="bg-white/10 hover:bg-white/20 text-white text-base sm:text-lg font-medium px-6 sm:px-8 py-3 sm:py-4 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/30 flex items-center gap-3 mx-auto"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L15 7V4C15 2.9 14.1 2 13 2H11C9.9 2 9 2.9 9 4V7L3 7V9H3C3 10.1 3.9 11 5 11H19C20.1 11 21 10.1 21 9M19 13H5V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V13Z"/>
                  </svg>
                  Continue with Passkey
                </motion.button>
              </motion.div>
            )}
          </motion.div>

          {/* Right Content - Social Media Post Mock */}
          <motion.div 
            className="flex-1 max-w-md w-full lg:ml-16"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          >
            <motion.div 
              className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 hover:bg-white/15 transition-all duration-500 w-full"
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              {/* User Profile */}
              <motion.div 
                className="flex items-center mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <motion.div 
                  className="w-12 sm:w-14 h-12 sm:h-14 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-6 sm:w-8 h-6 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </motion.div>
                <div className="ml-4 flex-1 min-w-0">
                  <motion.div 
                    className="h-4 bg-gradient-to-r from-white/60 to-white/40 rounded-full w-28 mb-2"
                    initial={{ width: 0 }}
                    animate={{ width: 112 }}
                    transition={{ duration: 0.8, delay: 1 }}
                  />
                  <motion.div 
                    className="h-3 bg-gradient-to-r from-white/40 to-white/20 rounded-full w-20"
                    initial={{ width: 0 }}
                    animate={{ width: 80 }}
                    transition={{ duration: 0.6, delay: 1.2 }}
                  />
                </div>
              </motion.div>

              {/* Post Content */}
              <motion.div 
                className="mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
                <motion.div 
                  className="h-4 bg-gradient-to-r from-white/50 to-white/30 rounded-full w-full mb-3"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1, delay: 1.3 }}
                />
                <motion.div 
                  className="h-4 bg-gradient-to-r from-white/40 to-white/20 rounded-full w-3/4 mb-6"
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 0.8, delay: 1.5 }}
                />
                
                {/* Image Placeholder */}
                <motion.div 
                  className="h-36 sm:h-48 bg-gradient-to-br from-white/20 to-white/5 rounded-2xl mb-6 border border-white/10"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 1.2 }}
                  whileHover={{ scale: 1.02 }}
                />
              </motion.div>

              {/* Interaction Buttons */}
              <motion.div 
                className="flex items-center justify-between pt-6 border-t border-white/10"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.4 }}
              >
                {[0, 1, 2, 3].map((index) => (
                  <motion.button
                    key={index}
                    className="flex items-center space-x-2 text-white/60 hover:text-white/90 p-2 rounded-full hover:bg-white/10 transition-all duration-300"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg className="w-5 sm:w-6 h-5 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {index === 0 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />}
                      {index === 1 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />}
                      {index === 2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />}
                      {index === 3 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />}
                    </svg>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Passkey Login Modal */}
      <PasskeyLoginModal
        isOpen={showPasskeyModal}
        onClose={() => setShowPasskeyModal(false)}
      />
    </div>
  )
}