import { motion } from 'framer-motion';
import logo from '@/assets/logo.jpg';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sidebar"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {
        setTimeout(onFinish, 2200);
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6"
      >
        <motion.img
          src={logo}
          alt="بن العميد"
          className="w-32 h-32 rounded-full shadow-2xl object-cover"
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.05, 1] }}
          transition={{ duration: 0.8, times: [0, 0.6, 1] }}
        />
        <motion.h1
          className="text-3xl font-bold text-sidebar-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          بن العميد
        </motion.h1>
        <motion.p
          className="text-sidebar-foreground/60 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          نظام إدارة الكافيه
        </motion.p>
        <motion.div
          className="mt-6 w-12 h-1 rounded-full bg-sidebar-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 1, 0.5, 1] }}
          transition={{ delay: 1, duration: 1.2, repeat: Infinity }}
        />
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
