# TODO
1. 记录路由历史的方式是不是换一个?
   直接通过location.href, 也就是URL来记录?
   cache目前是这种方式
   currentAction和comingAction的方式也要随之改变
   通过一个单独的导游类(guide)来实现记录路由历史和获取render options
   Guide {
      recordHistory()
      getCurrentPlace()
      getNextPlace()
      getDirection()
   }
2. 