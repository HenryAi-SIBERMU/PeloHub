import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
