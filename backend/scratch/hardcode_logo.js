const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../../frontend/public/images/logo.png'); // Corrected path
const targetPath = path.join(__dirname, '../../frontend/src/components/Logo.js'); // Corrected path

if (fs.existsSync(logoPath)) {
    const base64 = fs.readFileSync(logoPath).toString('base64');
    const dataUri = 'data:image/png;base64,' + base64;

    const content = [
        '"use client";',
        '',
        'import { motion } from "framer-motion";',
        '',
        '/**',
        ' * MASTER HARDCODED LOGO COMPONENT',
        ' * This component uses a high-fidelity Base64-encoded master asset ',
        ' * to ensure 100% brand fidelity with zero external dependencies.',
        ' */',
        '',
        'export const LogoIcon = ({ className = "w-10 h-10" }) => {',
        '  return (',
        '    <div className={`${className} flex items-center justify-center bg-white rounded-lg p-1 shadow-sm border border-border/10 overflow-hidden`}>',
        '      <img ',
        '        src="' + dataUri + '" ',
        '        alt="PC Alley Icon" ',
        '        className="w-full h-full object-cover scale-[2.8] transform -translate-x-[12%]" ',
        '      />',
        '    </div>',
        '  );',
        '};',
        '',
        'export const LogoFull = ({ className = "" }) => {',
        '  return (',
        '    <div className={`flex items-center justify-center bg-white rounded-xl shadow-sm border border-border/10 overflow-hidden w-full h-full p-0 ${className}`}>',
        '      <img ',
        '        src="' + dataUri + '" ',
        '        alt="PC Alley Logo" ',
        '        className="w-full h-full object-contain scale-[2.2]" ',
        '      />',
        '    </div>',
        '  );',
        '};',
        '',
        'export default LogoFull;',
        ''
    ].join('\n');

    fs.writeFileSync(targetPath, content);
    console.log('Successfully hardcoded logo into Logo.js');
} else {
    console.error('Logo image not found at:', logoPath);
}
