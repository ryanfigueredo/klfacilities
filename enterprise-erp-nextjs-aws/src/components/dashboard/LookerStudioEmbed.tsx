'use client';

interface LookerStudioEmbedProps {
  className?: string;
}

export function LookerStudioEmbed({ className = '' }: LookerStudioEmbedProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full rounded-lg shadow-lg bg-white overflow-hidden">
        <div className="w-full h-[2500px] sm:h-[1000px] md:h-[2500px] lg:h-[2500px]">
          <iframe
            src="https://lookerstudio.google.com/embed/reporting/d3b07305-bc73-4cbc-a32b-89d01434a20f/page/p_y9pm3f9swd"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{
              border: 0,
              width: '100%',
              height: '100%',
            }}
            allowFullScreen
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            className="w-full h-full"
            loading="lazy"
            title="Dashboard Looker Studio"
          />
        </div>
      </div>
    </div>
  );
}
