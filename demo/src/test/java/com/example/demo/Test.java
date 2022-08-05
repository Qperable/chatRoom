package com.example.demo;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class Test {

    public static void main(String[] args) {
//        Date date = new Date(1503544630000L);  // 对应的北京时间是2017-08-24 11:17:10
//
//        SimpleDateFormat bjSdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");     // 北京
//        bjSdf.setTimeZone(TimeZone.getTimeZone("Asia/Shanghai"));  // 设置北京时区
//
//        SimpleDateFormat tokyoSdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");  // 东京
//        tokyoSdf.setTimeZone(TimeZone.getTimeZone("Asia/Tokyo"));  // 设置东京时区
//
//        SimpleDateFormat londonSdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"); // 伦敦
//        londonSdf.setTimeZone(TimeZone.getTimeZone("Europe/London"));  // 设置伦敦时区
//
//        System.out.println("毫秒数:" + date.getTime() + ", 北京时间:" + bjSdf.format(date));
//        System.out.println("毫秒数:" + date.getTime() + ", 东京时间:" + tokyoSdf.format(date));
//        System.out.println("毫秒数:" + date.getTime() + ", 伦敦时间:" + londonSdf.format(date));

        Calendar calendar = Calendar.getInstance(Locale.CHINA);
        Date time = calendar.getTime();
        SimpleDateFormat data = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String format = data.format(time);
        System.out.println(format);
    }

}
