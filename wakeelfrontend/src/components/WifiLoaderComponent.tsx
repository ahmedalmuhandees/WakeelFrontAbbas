import React from 'react';

interface WifiLoaderProps {
  background?: string;
  desktopSize?: string;
  mobileSize?: string;
  text?: string;
  backColor?: string;
  frontColor?: string;
}

export const WifiLoaderComponent: React.FC<WifiLoaderProps> = ({
  background = "transparent",
  desktopSize = "150px",
  mobileSize = "150px",
  text = "Wifi Loader",
  backColor = "#E8F2FC",
  frontColor = "#4645F6"
}) => {
  return (
    <div 
      className="flex flex-col items-center justify-center"
      style={{ background }}
    >
      {/* WiFi Signal Animation */}
      <div className="relative" style={{ width: desktopSize, height: desktopSize }}>
        {/* WiFi Signal Arcs */}
        <div className="relative w-full h-full">
          {/* Arc 1 - Largest */}
          <div 
            className="absolute border-4 rounded-full wifi-loader-arc"
            style={{
              width: '100%',
              height: '100%',
              borderColor: `${frontColor}40`,
              borderTopColor: frontColor,
              borderRightColor: frontColor,
              animationDelay: '0s'
            }}
          />
          
          {/* Arc 2 */}
          <div 
            className="absolute border-4 rounded-full wifi-loader-arc"
            style={{
              width: '75%',
              height: '75%',
              borderColor: `${frontColor}40`,
              borderTopColor: frontColor,
              borderRightColor: frontColor,
              animationDelay: '0.2s',
              top: '12.5%',
              left: '12.5%'
            }}
          />
          
          {/* Arc 3 */}
          <div 
            className="absolute border-4 rounded-full wifi-loader-arc"
            style={{
              width: '50%',
              height: '50%',
              borderColor: `${frontColor}40`,
              borderTopColor: frontColor,
              borderRightColor: frontColor,
              animationDelay: '0.4s',
              top: '25%',
              left: '25%'
            }}
          />
          
          {/* Arc 4 - Smallest */}
          <div 
            className="absolute border-4 rounded-full wifi-loader-arc"
            style={{
              width: '25%',
              height: '25%',
              borderColor: `${frontColor}40`,
              borderTopColor: frontColor,
              borderRightColor: frontColor,
              animationDelay: '0.6s',
              top: '37.5%',
              left: '37.5%'
            }}
          />
          
          {/* Center Dot */}
          <div 
            className="absolute rounded-full wifi-loader-arc"
            style={{
              width: '10%',
              height: '10%',
              backgroundColor: frontColor,
              top: '45%',
              left: '45%',
              animationDelay: '0.8s'
            }}
          />
        </div>
      </div>
      
      {/* Text */}
      {text && (
        <div 
          className="mt-4 text-center font-medium"
          style={{ color: frontColor }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default WifiLoaderComponent;