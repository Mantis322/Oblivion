'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWallet } from '../contexts/WalletContext'
import { useRouter } from 'next/navigation'
import { useSpring, animated, useSpringValue, useTrail } from '@react-spring/web'
import { useInView } from 'react-intersection-observer'
import Confetti from 'react-confetti'
import Tilt from 'react-parallax-tilt'

export default function About() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [showConnectingAnimation, setShowConnectingAnimation] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [currentSlogan, setCurrentSlogan] = useState(0)
  const [isHovered, setIsHovered] = useState<string | null>(null)

  const [glitchEffect, setGlitchEffect] = useState(false)
  const { connectWallet, address, connecting } = useWallet()
  const router = useRouter()

  // Dynamic slogans for typewriter effect
  const slogans = [
    "Hybrid Web2/Web3 Social Revolution",
    "Decentralized Future of Content",
    "AI-Powered Business Intelligence",
    "Community-Driven Innovation"
  ]

  // Intersection Observer hooks for scroll animations
  const { ref: heroRef, inView: heroInView } = useInView({ threshold: 0.3, triggerOnce: true })
  const { ref: problemRef, inView: problemInView } = useInView({ threshold: 0.2, triggerOnce: true })
  const { ref: featuresRef, inView: featuresInView } = useInView({ threshold: 0.2, triggerOnce: true })
  const { ref: marketRef, inView: marketInView } = useInView({ threshold: 0.2, triggerOnce: true })
  const { ref: revenueRef, inView: revenueInView } = useInView({ threshold: 0.2, triggerOnce: true })

  // Advanced React Spring animations
  const heroSpring = useSpring({
    opacity: heroInView ? 1 : 0,
    transform: heroInView ? 'translateY(0px) scale(1)' : 'translateY(100px) scale(0.8)',
    config: { mass: 1, tension: 200, friction: 50 }
  })

  const glitchSpring = useSpring({
    transform: glitchEffect 
      ? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px) skew(${Math.random() * 2 - 1}deg)`
      : 'translate(0px, 0px) skew(0deg)',
    filter: glitchEffect ? 'hue-rotate(90deg) saturate(2)' : 'hue-rotate(0deg) saturate(1)',
    config: { duration: 100 }
  })

  const morphingBackground = useSpring({
    background: heroInView 
      ? `radial-gradient(circle at ${mousePosition.x * 0.1}% ${mousePosition.y * 0.1}%, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.2), rgba(236, 72, 153, 0.1))`
      : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.05), rgba(236, 72, 153, 0.02))',
    config: { duration: 2000 }
  })

  // Dynamic floating animation with physics
  const floatingAnimation = useSpring({
    loop: true,
    from: { 
      transform: 'translateY(0px) rotate(0deg) scale(1)',
      filter: 'brightness(1) contrast(1)'
    },
    to: async (next) => {
      while (true) {
        await next({ 
          transform: 'translateY(-30px) rotate(3deg) scale(1.05)',
          filter: 'brightness(1.2) contrast(1.1)'
        })
        await next({ 
          transform: 'translateY(10px) rotate(-1deg) scale(0.95)',
          filter: 'brightness(0.9) contrast(0.9)'
        })
        await next({ 
          transform: 'translateY(-15px) rotate(2deg) scale(1.02)',
          filter: 'brightness(1.1) contrast(1.05)'
        })
        await next({ 
          transform: 'translateY(0px) rotate(0deg) scale(1)',
          filter: 'brightness(1) contrast(1)'
        })
      }
    },
    config: { duration: 4000, easing: t => Math.sin(t * Math.PI) }
  })

  // Trail animation for metrics with stagger
  const metricsTrail = useTrail(4, {
    opacity: heroInView ? 1 : 0,
    transform: heroInView ? 'scale(1) translateY(0px) rotateX(0deg)' : 'scale(0.5) translateY(60px) rotateX(45deg)',
    config: { mass: 2, tension: 280, friction: 60 },
    delay: heroInView ? 0 : 0,
  })

  // Interactive pulse animation
  const pulseAnimation = useSpring({
    loop: true,
    from: { 
      transform: 'scale(1)', 
      boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.4)',
      filter: 'brightness(1)'
    },
    to: async (next) => {
      while (true) {
        await next({ 
          transform: 'scale(1.08)', 
          boxShadow: '0 0 40px 10px rgba(59, 130, 246, 0.2)',
          filter: 'brightness(1.3)'
        })
        await next({ 
          transform: 'scale(1)', 
          boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.0)',
          filter: 'brightness(1)'
        })
      }
    },
    config: { duration: 3000 }
  })
  

  
  useEffect(() => {
    setMounted(true)
    
    // Window size için
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    // Slogan değiştirme efekti
    const sloganInterval = setInterval(() => {
      setCurrentSlogan(prev => (prev + 1) % slogans.length)
    }, 3000)
    
    // Random glitch efekti
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.1) { // %10 şans
        setGlitchEffect(true)
        setTimeout(() => setGlitchEffect(false), 200)
      }
    }, 2000)
    
    updateWindowSize()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', updateWindowSize)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', updateWindowSize)
      clearInterval(sloganInterval)
      clearInterval(glitchInterval)
    }
  }, [slogans.length])

  // Handle wallet connection with animation
  const handleWalletConnect = async () => {
    await connectWallet()
    if (address) {
      setShowConfetti(true)
      setShowConnectingAnimation(true)
      setTimeout(() => {
        setShowConfetti(false)
      }, 3000)
      setTimeout(() => {
        router.push('/home')
      }, 2000)
    }
  }

  // Watch for address changes to trigger animation
  useEffect(() => {
    if (address && !showConnectingAnimation) {
      setShowConfetti(true)
      setShowConnectingAnimation(true)
      setTimeout(() => {
        setShowConfetti(false)
      }, 3000)
      setTimeout(() => {
        router.push('/home')
      }, 2000)
    }
  }, [address, showConnectingAnimation, router])

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B']}
        />
      )}

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
      
      {/* Advanced Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Morphing Background */}
        <animated.div 
          style={morphingBackground}
          className="absolute inset-0 opacity-40"
        />

        {/* Dynamic Geometric Shapes */}
        <animated.div
          style={floatingAnimation}
          className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-blue-400/30 rounded-lg rotate-45"
          onMouseEnter={() => setIsHovered('shape1')}
          onMouseLeave={() => setIsHovered(null)}
        />
        <animated.div
          style={{
            ...floatingAnimation,
            animationDelay: '1s'
          }}
          className="absolute top-3/4 right-1/4 w-24 h-24 border-2 border-purple-400/30 rounded-full"
        />
        <animated.div
          style={{
            ...floatingAnimation,
            animationDelay: '2s'
          }}
          className="absolute top-1/2 right-1/3 w-16 h-16 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg rotate-12"
        />

        {/* Interactive Light Beams */}
        {mounted && Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 bg-gradient-to-t from-transparent via-blue-400/20 to-transparent"
            style={{
              height: '100vh',
              left: `${10 + i * 12}%`,
              top: 0,
            }}
            animate={{
              opacity: [0, 0.3, 0],
              scaleX: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}

        {/* Enhanced Floating Orbs with Mouse Interaction */}
        <motion.div
          className="absolute w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15), rgba(236, 72, 153, 0.15))',
            top: '5%',
            right: '5%',
            filter: isHovered ? 'brightness(1.5) saturate(1.5)' : 'brightness(1) saturate(1)',
          }}
          animate={{
            x: [-30 + mousePosition.x * 0.01, 30 + mousePosition.x * 0.01, -30 + mousePosition.x * 0.01],
            y: [-15 + mousePosition.y * 0.01, 15 + mousePosition.y * 0.01, -15 + mousePosition.y * 0.01],
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute w-80 h-80 rounded-full blur-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.15), rgba(168, 85, 247, 0.15))',
            bottom: '10%',
            left: '0%',
          }}
          animate={{
            x: [-20 - mousePosition.x * 0.005, 20 - mousePosition.x * 0.005, -20 - mousePosition.x * 0.005],
            y: [-10 - mousePosition.y * 0.005, 10 - mousePosition.y * 0.005, -10 - mousePosition.y * 0.005],
            scale: [1, 0.8, 1.1, 1],
            rotate: [0, -90, -180, -270, -360],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        

        
        {/* Enhanced Grid Pattern with Animation */}
        <motion.div 
          className="absolute inset-0 opacity-20"
          animate={{
            backgroundPosition: ['0px 0px', '50px 50px', '0px 0px'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Holographic Effects */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              'linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.1), transparent)',
              'linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.1), transparent)',
              'linear-gradient(135deg, transparent, rgba(236, 72, 153, 0.1), transparent)',
              'linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.1), transparent)',
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
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
          {/* Hero Section - Ultra Dynamic Pitch Deck Style */}
          <animated.div 
            ref={heroRef}
            style={heroSpring}
            className="text-center mb-20"
          >
            <Tilt
              perspective={1000}
              glareEnable={true}
              glareMaxOpacity={0.3}
              glareColor="#3B82F6"
              scale={1.02}
              gyroscope={true}
            >
              <motion.div
                className="inline-block bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-lg border border-white/30 rounded-full px-8 py-3 mb-8"
                whileHover={{ 
                  scale: 1.1, 
                  boxShadow: "0 0 50px rgba(59, 130, 246, 0.5)",
                  borderColor: "rgba(255, 255, 255, 0.8)"
                }}
                animate={{
                  borderColor: ["rgba(255, 255, 255, 0.3)", "rgba(59, 130, 246, 0.8)", "rgba(147, 51, 234, 0.8)", "rgba(255, 255, 255, 0.3)"]
                }}
                transition={{
                  borderColor: { duration: 4, repeat: Infinity }
                }}
              >
                <span className="text-white font-bold text-lg">🚀 Next-Gen Social Platform</span>
              </motion.div>
            </Tilt>
            
            <animated.h1 
              style={{
                ...floatingAnimation,
                ...glitchSpring
              }}
              className="text-6xl sm:text-7xl lg:text-8xl font-black bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent leading-tight mb-8 cursor-pointer"
              onMouseEnter={() => {
                setGlitchEffect(true)
                setTimeout(() => setGlitchEffect(false), 300)
              }}
            >
              OBLIVION
            </animated.h1>
            
            {/* Dynamic Typewriter Effect */}
            <motion.div
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white/90 mb-6 h-20 flex items-center justify-center"
              key={currentSlogan}
              initial={{ opacity: 0, y: 20, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -20, rotateX: -90 }}
              transition={{ duration: 0.8 }}
            >
              {slogans[currentSlogan]}
            </motion.div>
            
            <Tilt
              perspective={1000}
              scale={1.05}
              gyroscope={true}
            >
              <motion.p 
                className="text-xl sm:text-2xl text-white/70 leading-relaxed max-w-4xl mx-auto mb-12 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
                whileHover={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)"
                }}
              >
                The first social media platform that seamlessly bridges traditional posting with blockchain permanence, 
                powered by AI-driven business intelligence and community-funded ventures.
              </motion.p>
            </Tilt>

            {/* Enhanced Key Metrics with 3D Tilt Effects */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {[
                { label: "User Choice", value: "Web2 + Web3", icon: "🔄", color: "from-blue-500 to-cyan-500" },
                { label: "Blockchain", value: "Stellar", icon: "⭐", color: "from-yellow-500 to-orange-500" },
                { label: "AI Platform", value: "O.B.I.", icon: "🧠", color: "from-purple-500 to-pink-500" },
                { label: "Revenue", value: "Multi-Stream", icon: "💰", color: "from-green-500 to-emerald-500" }
              ].map((metric, index) => (
                <Tilt
                  key={index}
                  perspective={1000}
                  glareEnable={true}
                  glareMaxOpacity={0.2}
                  scale={1.1}
                  gyroscope={true}
                >
                  <motion.div
                    className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-500 cursor-pointer relative overflow-hidden group"
                    initial={{ opacity: 0, y: 50, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, delay: index * 0.2 }}
                    whileHover={{
                      y: -10,
                      scale: 1.05,
                      boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)"
                    }}
                    onMouseEnter={() => setIsHovered(`metric-${index}`)}
                    onMouseLeave={() => setIsHovered(null)}
                  >
                    {/* Animated Background Gradient */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                      animate={isHovered === `metric-${index}` ? {
                        background: [
                          `linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.2), transparent)`,
                          `linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.2), transparent)`,
                          `linear-gradient(135deg, transparent, rgba(236, 72, 153, 0.2), transparent)`,
                        ]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    
                    <motion.div 
                      className="text-4xl mb-4"
                      animate={isHovered === `metric-${index}` ? {
                        scale: [1, 1.3, 1],
                        rotate: [0, 360, 0]
                      } : {}}
                      transition={{ duration: 1 }}
                    >
                      {metric.icon}
                    </motion.div>
                    <div className="text-2xl font-bold text-white relative z-10">{metric.value}</div>
                    <div className="text-sm text-white/60 relative z-10">{metric.label}</div>
                    
                    {/* Hover Particles */}
                    {isHovered === `metric-${index}` && Array.from({ length: 10 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          y: [0, -20],
                          opacity: [1, 0],
                          scale: [0, 1, 0]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.1
                        }}
                      />
                    ))}
                  </motion.div>
                </Tilt>
              ))}
            </div>
          </animated.div>

          {/* Problem & Solution Section */}
          <div 
            ref={problemRef}
            className="mb-20"
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-12"
              initial={{ y: 50, opacity: 0 }}
              animate={problemInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              The Problem We're Solving
            </motion.h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <motion.div
                className="bg-red-500/10 backdrop-blur-xl rounded-3xl p-8 border border-red-500/20 hover:bg-red-500/15 transition-all duration-500"
                initial={{ x: -100, opacity: 0 }}
                animate={problemInView ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                whileHover={{ scale: 1.02, rotateY: 5 }}
              >
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-2xl font-bold text-white mb-4">Current Social Media Issues</h3>
                <ul className="text-white/70 space-y-3">
                  {[
                    "Centralized control & censorship",
                    "Limited monetization for creators", 
                    "No permanent content storage",
                    "Lack of business intelligence tools"
                  ].map((issue, index) => (
                    <motion.li 
                      key={index}
                      className="flex items-start"
                      initial={{ opacity: 0, x: -20 }}
                      animate={problemInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                    >
                      <span className="text-red-400 mr-2">•</span>{issue}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                className="bg-green-500/10 backdrop-blur-xl rounded-3xl p-8 border border-green-500/20 hover:bg-green-500/15 transition-all duration-500"
                initial={{ x: 100, opacity: 0 }}
                animate={problemInView ? { x: 0, opacity: 1 } : { x: 100, opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                whileHover={{ scale: 1.02, rotateY: -5 }}
              >
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-white mb-4">Oblivion's Solution</h3>
                <ul className="text-white/70 space-y-3">
                  {[
                    "Hybrid Web2/Web3 architecture",
                    "Multiple revenue streams",
                    "Blockchain permanence option", 
                    "Built-in O.B.I. platform"
                  ].map((solution, index) => (
                    <motion.li 
                      key={index}
                      className="flex items-start"
                      initial={{ opacity: 0, x: 20 }}
                      animate={problemInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                    >
                      <span className="text-green-400 mr-2">•</span>{solution}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>

          {/* Core Features with Enhanced Visuals */}
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
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="text-2xl font-bold text-white mb-4">O.B.I. Education Platform</h3>
              <p className="text-white/70 leading-relaxed">
                Oblivion Business Intelligence - Create and sell courses with <strong className="text-emerald-400">0% commission</strong>! 
                Whether you're a yoga instructor, chef, programmer, or artist - build your education empire without platform fees.
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
                <span className="mr-3">🎓</span>
                Zero-Commission Education Platform
              </h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Unlike Udemy (40% commission), sell your courses with 0% platform fees! 
                Yoga instructor? Tech expert? Artist? Keep 100% of your earnings on our decentralized education marketplace.
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

          {/* Market Opportunity */}
          <div 
            ref={marketRef}
            className="mb-20"
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-12"
              initial={{ y: 50, opacity: 0 }}
              animate={marketInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              Market Opportunity
            </motion.h2>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                { value: "$150B", label: "Social Media Market", gradient: "from-blue-400 to-cyan-400" },
                { value: "$104B", label: "Creator Economy", gradient: "from-purple-400 to-pink-400" },
                { value: "$3.7T", label: "Blockchain Market", gradient: "from-green-400 to-teal-400" }
              ].map((market, index) => (
                <motion.div
                  key={index}
                  className="text-center"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={marketInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <div className={`text-4xl sm:text-5xl font-black bg-gradient-to-r ${market.gradient} bg-clip-text text-transparent mb-2`}>
                    {market.value}
                  </div>
                  <div className="text-white/60 text-sm uppercase tracking-wider">{market.label}</div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center"
              initial={{ y: 50, opacity: 0 }}
              animate={marketInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
            >
              <h3 className="text-2xl font-bold text-white mb-4">Unique Position</h3>
              <p className="text-white/70 text-lg leading-relaxed max-w-3xl mx-auto">
                Oblivion sits at the intersection of three massive markets, offering the only hybrid solution 
                that bridges Web2 convenience with Web3 permanence and AI-powered business tools.
              </p>
            </motion.div>
          </div>

          {/* Business Model */}
          <motion.div 
            className="mb-20"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 4.4 }}
          >
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-12"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 4.6 }}
            >
              Revenue Streams
            </motion.h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Transaction Fees",
                  description: "Small fees on blockchain posts and transactions",
                  icon: "💳",
                  color: "from-blue-500/20 to-cyan-500/20"
                },
                {
                  title: "Premium Features",
                  description: "Advanced O.B.I. tools and analytics",
                  icon: "⭐",
                  color: "from-purple-500/20 to-pink-500/20"
                },
                {
                  title: "Campaign Platform",
                  description: "Commission from successful crowdfunding",
                  icon: "🎯",
                  color: "from-green-500/20 to-emerald-500/20"
                },
                {
                  title: "Educational Content",
                  description: "0% commission - Keep 100% of your course sales!",
                  icon: "🎓",
                  color: "from-orange-500/20 to-red-500/20"
                }
              ].map((stream, index) => (
                <motion.div
                  key={index}
                  className={`bg-gradient-to-br ${stream.color} backdrop-blur-xl rounded-2xl p-6 border border-white/20 text-center`}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 4.8 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="text-3xl mb-4">{stream.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{stream.title}</h3>
                  <p className="text-white/60 text-sm">{stream.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Competitive Advantage - Ultra Compelling */}
          <motion.div 
            className="mb-20 relative"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 5.2 }}
          >
            {/* Dramatic Background Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 rounded-3xl blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            <Tilt
              perspective={1000}
              scale={1.02}
              gyroscope={true}
            >
              <motion.h2 
                className="text-4xl sm:text-5xl lg:text-6xl font-black text-center mb-4 relative z-10"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 5.4 }}
                whileHover={{
                  scale: 1.05,
                  textShadow: "0 0 20px rgba(255, 255, 255, 0.5)"
                }}
              >
                <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  🏆 THE GAME CHANGER
                </span>
              </motion.h2>
            </Tilt>

            <motion.p
              className="text-xl sm:text-2xl text-center text-white/80 mb-16 max-w-4xl mx-auto relative z-10"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 5.6 }}
            >
              While others talk about the future, <strong className="text-transparent bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text">we're building it</strong>. 
              Here's why Oblivion will dominate the social media revolution:
            </motion.p>
            
            <div className="grid md:grid-cols-2 gap-12">
              <motion.div
                className="space-y-8"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 5.8 }}
              >
                {[
                  { 
                    title: "🎯 FIRST & ONLY", 
                    desc: "The world's first hybrid Web2/Web3 social platform - no competition exists!",
                    impact: "Market Leadership",
                    gradient: "from-red-500 to-orange-500"
                  },
                  { 
                    title: "⚡ ULTIMATE FREEDOM", 
                    desc: "Users control their destiny - choose temporary posts or eternal blockchain storage",
                    impact: "User Empowerment", 
                    gradient: "from-orange-500 to-yellow-500"
                  },
                  { 
                    title: "🚀 TRIPLE THREAT", 
                    desc: "Social Media + Business Intelligence + Education = Unstoppable Ecosystem",
                    impact: "Market Domination",
                    gradient: "from-yellow-500 to-red-500"
                  },
                  { 
                    title: "🌊 ZERO FRICTION", 
                    desc: "From grandma to crypto native - everyone can join the revolution effortlessly",
                    impact: "Mass Adoption",
                    gradient: "from-purple-500 to-pink-500"
                  }
                ].map((advantage, index) => (
                  <motion.div
                    key={index}
                    className="relative group"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 6.0 + index * 0.1 }}
                    whileHover={{ scale: 1.05, x: 10 }}
                  >
                    {/* Glowing Background */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r ${advantage.gradient} opacity-0 group-hover:opacity-20 rounded-2xl blur-xl transition-all duration-500`}
                    />
                    
                    <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 group-hover:border-white/40 transition-all duration-300">
                      <div className="flex items-start space-x-4">
                        <motion.div 
                          className={`w-12 h-12 bg-gradient-to-r ${advantage.gradient} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-2xl`}
                          animate={{
                            rotate: [0, 360],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{
                            rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                            scale: { duration: 2, repeat: Infinity, delay: index * 0.5 }
                          }}
                        >
                          {index + 1}
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-orange-200 group-hover:bg-clip-text transition-all duration-300">
                            {advantage.title}
                          </h3>
                          <p className="text-white/70 text-sm leading-relaxed mb-3">{advantage.desc}</p>
                          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${advantage.gradient} text-white shadow-lg`}>
                            {advantage.impact}
                          </div>
                        </div>
                      </div>

                      {/* Particle Effects on Hover */}
                      <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100"
                            style={{
                              left: `${20 + i * 15}%`,
                              top: `${20 + i * 10}%`,
                            }}
                            animate={{
                              y: [0, -20, 0],
                              opacity: [0, 1, 0],
                              scale: [0, 1, 0]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.2
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              
              <motion.div
                className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl rounded-3xl p-8 border border-emerald-500/20"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 6.2 }}
                whileHover={{ scale: 1.02, borderColor: "rgba(16, 185, 129, 0.4)" }}
              >
                <div className="text-center mb-6">
                  <div className="text-4xl mb-4">🎓</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Creator Freedom</h3>
                  <p className="text-emerald-300 font-semibold">0% Commission Education Platform</p>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-2xl p-4 border border-emerald-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold">Udemy, Coursera</span>
                      <span className="text-red-400 font-bold">40% Commission</span>
                    </div>
                    <div className="text-white/60 text-sm">Traditional platforms take huge cuts from your earnings</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl p-4 border border-emerald-400/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold">🚀 Oblivion O.B.I.</span>
                      <span className="text-emerald-400 font-bold text-xl">0% Commission</span>
                    </div>
                    <div className="text-emerald-200 text-sm">Keep 100% of your earnings! Yoga, coding, art, business - any skill!</div>
                  </div>
                </div>
                
                <motion.div 
                  className="mt-6 text-center"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <div className="text-emerald-300 text-sm font-semibold">
                    🌟 From Yoga Instructors to Tech Experts - Everyone Wins!
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Ultra Interactive Vision & Call to Action */}
          <motion.div 
            className="relative bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-8 sm:p-16 border border-white/30 text-center mb-16 overflow-hidden"
            initial={{ y: 100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 6.8 }}
            whileHover={{ 
              scale: 1.02,
              boxShadow: "0 50px 100px rgba(0, 0, 0, 0.3)"
            }}
          >
            {/* Animated Background Orbs */}
            <motion.div
              className="absolute inset-0 opacity-30"
              animate={{
                background: [
                  'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3), transparent 50%)',
                  'radial-gradient(circle at 80% 50%, rgba(147, 51, 234, 0.3), transparent 50%)',
                  'radial-gradient(circle at 50% 20%, rgba(236, 72, 153, 0.3), transparent 50%)',
                  'radial-gradient(circle at 50% 80%, rgba(34, 197, 94, 0.3), transparent 50%)',
                  'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3), transparent 50%)',
                ]
              }}
              transition={{ duration: 10, repeat: Infinity }}
            />

            <Tilt
              perspective={1000}
              scale={1.05}
              gyroscope={true}
            >
              <motion.h2 
                className="text-5xl sm:text-6xl lg:text-7xl font-black bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-8 relative z-10"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  backgroundSize: '200% 200%'
                }}
              >
                Join the Revolution
              </motion.h2>
            </Tilt>

            <motion.p 
              className="text-xl sm:text-2xl text-white/90 leading-relaxed max-w-4xl mx-auto mb-12 relative z-10"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 7.2 }}
            >
              Be part of the first platform that truly bridges Web2 and Web3, 
              empowering creators with unprecedented control and monetization opportunities.
            </motion.p>
            
            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12 relative z-10"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 7.4 }}
            >
              <Tilt
                perspective={1000}
                scale={1.1}
                gyroscope={true}
              >
                <Link href="/">
                  <motion.button 
                    className="relative bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold px-10 py-5 rounded-2xl text-xl overflow-hidden group"
                    whileHover={{ 
                      scale: 1.1,
                      boxShadow: "0 20px 40px rgba(59, 130, 246, 0.4)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(59, 130, 246, 0.3)",
                        "0 0 40px rgba(147, 51, 234, 0.4)",
                        "0 0 20px rgba(236, 72, 153, 0.3)",
                        "0 0 20px rgba(59, 130, 246, 0.3)"
                      ]
                    }}
                    transition={{
                      boxShadow: { duration: 4, repeat: Infinity }
                    }}
                  >
                    {/* Button Background Animation */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <span className="relative z-10">🚀 Start Building Today</span>
                  </motion.button>
                </Link>
              </Tilt>
              
              <Tilt
                perspective={1000}
                scale={1.1}
                gyroscope={true}
              >
                <motion.button 
                  className="relative border-2 border-white/40 text-white font-bold px-10 py-5 rounded-2xl backdrop-blur-sm text-xl overflow-hidden group"
                  whileHover={{ 
                    scale: 1.1,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderColor: "rgba(255, 255, 255, 0.8)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWalletConnect}
                  disabled={connecting || showConnectingAnimation}
                  animate={{
                    borderColor: [
                      "rgba(255, 255, 255, 0.4)",
                      "rgba(59, 130, 246, 0.8)",
                      "rgba(147, 51, 234, 0.8)",
                      "rgba(255, 255, 255, 0.4)"
                    ]
                  }}
                  transition={{
                    borderColor: { duration: 3, repeat: Infinity }
                  }}
                >
                  {/* Glowing Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <span className="relative z-10">
                    {connecting || showConnectingAnimation ? '⏳ Connecting...' : '🔗 Connect Wallet'}
                  </span>
                </motion.button>
              </Tilt>
            </motion.div>

            {/* Enhanced Social Proof with Animated Icons */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto relative z-10"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 7.6 }}
            >
              {[
                { number: "∞", label: "Potential", color: "from-blue-400 to-cyan-400" },
                { number: "🌍", label: "Global", color: "from-green-400 to-emerald-400" },
                { number: "🔒", label: "Secure", color: "from-purple-400 to-pink-400" },
                { number: "🚀", label: "Future", color: "from-yellow-400 to-orange-400" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 7.8 + index * 0.1,
                    type: "spring",
                    stiffness: 200
                  }}
                  whileHover={{
                    scale: 1.1,
                    backgroundColor: "rgba(255, 255, 255, 0.1)"
                  }}
                >
                  <motion.div 
                    className="text-3xl font-bold mb-2"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.5
                    }}
                  >
                    {stat.number}
                  </motion.div>
                  <div className={`text-sm uppercase tracking-wide font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Floating Elements */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -50, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}