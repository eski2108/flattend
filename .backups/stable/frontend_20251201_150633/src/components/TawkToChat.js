import { useEffect } from 'react';

const TawkToChat = () => {
  useEffect(() => {
    // Tawk.to script will be injected here once you provide credentials
    // This component is ready to receive your propertyId and widgetId
    
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://embed.tawk.to/YOUR_PROPERTY_ID/YOUR_WIDGET_ID';
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    document.body.appendChild(script);
    
    return () => {
      // Cleanup
      document.body.removeChild(script);
    };
  }, []);

  return null;
};

export default TawkToChat;
