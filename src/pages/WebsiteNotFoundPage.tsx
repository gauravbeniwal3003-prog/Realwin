import React, { useMemo, useEffect } from 'react';

export const WebsiteNotFoundPage: React.FC = () => {
  useEffect(() => {
    document.title = '404: NOT_FOUND';
  }, []);

  // Generate authentic looking region and deployment ID (e.g. bom1, sin1, dxb1, hnd1)
  const deploymentId = useMemo(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let rand = '';
    for (let i = 0; i < 5; i++) rand += chars[Math.floor(Math.random() * chars.length)];
    let hash = '';
    for (let i = 0; i < 12; i++) hash += chars[Math.floor(Math.random() * chars.length)];
    const ts = Date.now();
    return `bom1::${rand}-${ts}-${hash}`;
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#111] flex flex-col items-center justify-center p-4 font-sans select-none antialiased">
      <div className="w-full max-w-[580px] space-y-5">
        {/* Top Error Card */}
        <div className="bg-white border border-[#eaeaea] rounded-lg p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h1 className="text-[15px] font-semibold text-black mb-6 tracking-tight">
            404: NOT_FOUND
          </h1>

          <div className="space-y-2 text-[13px] text-[#333]">
            <div className="flex items-center gap-1.5 font-normal">
              <span>Code:</span>
              <code className="font-mono text-[12.5px] text-[#222] bg-[#f2f2f2] px-1.5 py-0.5 rounded-[4px] border border-[#e5e5e5]">
                DEPLOYMENT_NOT_FOUND
              </code>
            </div>
            <div className="flex items-center gap-1.5 font-normal flex-wrap">
              <span>ID:</span>
              <code className="font-mono text-[12.5px] text-[#222] bg-[#f2f2f2] px-1.5 py-0.5 rounded-[4px] border border-[#e5e5e5] break-all">
                {deploymentId}
              </code>
            </div>
          </div>
        </div>

        {/* Bottom Documentation Box */}
        <div className="bg-white border border-[#0070f3] rounded-lg p-5 text-[13px] text-[#0070f3] leading-relaxed shadow-[0_1px_2px_rgba(0,112,243,0.04)]">
          <span>This deployment cannot be found. For more information and troubleshooting, </span>
          <a
            href="https://vercel.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition cursor-pointer font-normal"
          >
            see our documentation.
          </a>
        </div>
      </div>
    </div>
  );
};

