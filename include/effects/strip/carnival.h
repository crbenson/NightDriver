// carnival colors display
#pragma once

#include <sys/types.h>
#include <errno.h>
#include <iostream>
#include <vector>
#include <math.h>
#include "colorutils.h"
#include "globals.h"
#include "ledstripeffect.h"

//extern AppTime g_AppTime;
using namespace std;



class CarnivalEffect: public LEDStripEffect
{
    private:
    uint position = 0;
    size_t  _cLength;
    float   _defaultSize;
    float   _defaultSpeed;
    vector<CRGB> Colors;
    
  public:

    CarnivalEffect()
        : LEDStripEffect(EFFECT_STRIP_CARNIVAL,"Carnival Effect")
        {
        }

       CarnivalEffect(const JsonObjectConst& jsonObject)
        : LEDStripEffect(jsonObject),
          _defaultSize(jsonObject[PTY_SIZE]),
          _defaultSpeed(jsonObject[PTY_SPEED])
    {
    }

    bool SerializeToJSON(JsonObject& jsonObject) override
    {
        StaticJsonDocument<LEDStripEffect::_jsonSize> jsonDoc;

        JsonObject root = jsonDoc.to<JsonObject>();
        LEDStripEffect::SerializeToJSON(root);

        jsonDoc[PTY_SIZE] = _defaultSize;
        jsonDoc[PTY_SPEED] = _defaultSpeed;

        assert(!jsonDoc.overflowed());

        return jsonObject.set(jsonDoc.as<JsonObjectConst>());
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
        unsigned long msElapsed = millis() - lastms;
        uint16_t position;
         uint16_t i;
        static uint16_t loop_no  = 0;
        lastms = millis();
        
        // ClearFrameOnAllChannels();
        for(i = 0; i < 143; i+= 3)
        {
            switch( loop_no){
            case 0:
            {
                setPixelsOnAllChannels(i,1,CRGB::Green,false);
                setPixelsOnAllChannels(i+1,1,CRGB::Gold,false);
                setPixelsOnAllChannels(i+2,1,CRGB::Purple,false);
            }
            break;
            case 1:
            {
                setPixelsOnAllChannels(i+1,1,CRGB::Purple,false);
                setPixelsOnAllChannels(i+2,1,CRGB::Green,false);
                setPixelsOnAllChannels(i,1,CRGB::Gold,false);
            }
            break;
            case 2:
            {
                setPixelsOnAllChannels(i+2,1,CRGB::Gold,false);
                setPixelsOnAllChannels(i,1,CRGB::Purple,false);
                setPixelsOnAllChannels(i+1,1,CRGB::Green,false);
            }
            break;
            }
        }
        loop_no ++;
        if (loop_no > 2)
        {
            loop_no = 0;
        }

        delay(100);
        
    }
};