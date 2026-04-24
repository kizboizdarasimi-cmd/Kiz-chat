import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background sm:border-x sm:border-border relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-primary shadow-2xl shadow-primary/20 mb-6">
            <svg viewBox="0 0 120 120" fill="none" className="w-16 h-16">
              <path d="M40 40 L80 60 L40 80 Z" fill="white" />
            </svg>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-foreground mb-2">
            Buzz
          </h1>
          <p className="text-lg text-muted-foreground max-w-[280px]">
            Watch, chat, and share your vibe. The new way to connect.
          </p>
        </motion.div>

        <motion.div 
          className="relative w-full max-w-[280px] aspect-[9/16] rounded-[2rem] border-4 border-border/50 bg-black shadow-2xl overflow-hidden mb-10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <img 
            src="/hero-mockup.png" 
            alt="Buzz App Preview" 
            className="w-full h-full object-cover"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
        </motion.div>

        <motion.div 
          className="w-full flex flex-col gap-3 mt-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Link href="/sign-up" className="w-full">
            <Button size="lg" className="w-full text-lg h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/25 transition-transform active:scale-95">
              Get Started
            </Button>
          </Link>
          <Link href="/sign-in" className="w-full">
            <Button size="lg" variant="outline" className="w-full text-lg h-14 rounded-xl font-bold border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/10 transition-transform active:scale-95">
              I already have an account
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
