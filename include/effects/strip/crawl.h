// crawl effect, will just light one pixel at a time advancing one place each cycle
#pragma once

#include <sys/types.h>
#include <errno.h>
#include <iostream>
#include <vector>
#include <math.h>
#include "colorutils.h"
#include "globals.h"
#include "ledstripeffect.h"

// extern AppTime g_AppTime;
using namespace std;

static const CRGB dotColors[] =
{
    CRGB::Green,
    CRGB::Red,
    CRGB::Blue,
    CRGB::Orange,
    CRGB::Indigo,
    CRGB::Violet
};

class CrawlEffect : public LEDStripEffect
{
    private:
    uint position = 0;
    size_t  _cLength;
    vector<CRGB> Colors;
    
  public:

    CrawlEffect()
        : LEDStripEffect(EFFECT_STRIP_CRAWL,"Crawl Effect")
        {
        }
    virtual bool Init(std::shared_ptr<GFXBase> gfx[NUM_CHANNELS])
    {
        //if (!LEDStripEffect::Init(gfx))
        //    return false;

        _cLength = gfx[0]->GetLEDCount(); 

            
        return true; 
    }
  virtual void Draw()
    {
        static float hue = 0.0f;
        static unsigned long lastms = millis();
        static int16_t topLED = _cLength - 1;
        static CRGB OldColor = {0,0,0};
        static CRGB NewColor = {0,0,0};

        unsigned long msElapsed = millis() - lastms;
        lastms = millis();
        while (NewColor == OldColor) 
        { 
            NewColor = RandomRainbowColor();
        }
        OldColor = NewColor;

        setPixelOnAllChannels(position,NewColor);
        //printf("%d\t",position);
        if(( position > 0 ) && (position < topLED) )
        { 
            fadePixelToBlackOnAllChannelsBy(position - 1, 255);
        }
        position += 1;
        if( position >= topLED)
        {
            position = 0;
            topLED -- ;
        }
        if(topLED == 0)
        {
            setAllOnAllChannels(0,0,0);
            topLED = _cLength - 1;
        }
        delay(1);

    }
};